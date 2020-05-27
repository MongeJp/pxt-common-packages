#include "pxt.h"

namespace pxt {

VMImage *setVMImgError(VMImage *img, int code, void *pos) {
    img->errorOffset = pos ? (int)((uint8_t *)pos - (uint8_t *)img->dataStart) : 0;
    img->errorCode = code;
    return img;
}

// next free error 1057
#define ERROR(code, pos) return setVMImgError(img, code, pos)
#define CHECK(cond, code)                                                                          \
    do {                                                                                           \
        if (!(cond))                                                                               \
            ERROR(code, sect);                                                                     \
    } while (0)
#define CHECK_AT(cond, code, pos)                                                                  \
    do {                                                                                           \
        if (!(cond))                                                                               \
            ERROR(code, pos);                                                                      \
    } while (0)
#define ALIGNED(sz) (((sz)&7) == 0)

#define FOR_SECTIONS()                                                                             \
    VMImageSection *sect, *next;                                                                   \
    for (sect = (VMImageSection *)img->dataStart;                                                  \
         (next = vmNextSection(sect), (uint64_t *)sect < img->dataEnd); sect = next)

#define ALLOC_ARRAY(tp, sz) (tp *)gcPrealloc(sizeof(tp) * sz)

static VMImage *countSections(VMImage *img) {
    auto p = img->dataStart;
    while (p < img->dataEnd) {
        auto sect = (VMImageSection *)p;
        CHECK(ALIGNED(sect->size), 1002);
        CHECK(sect->size > 0, 1002);
        img->numSections++;
        p += sect->size >> 3;
    }
    CHECK_AT(p == img->dataEnd, 1003, p);
    img->pointerLiterals = ALLOC_ARRAY(TValue, img->numSections);
    img->sections = ALLOC_ARRAY(VMImageSection *, img->numSections);

    return NULL;
}

struct CompiledString {
    uint32_t numbytes;
    char utf8data[0];
};

static VMImage *loadSections(VMImage *img) {
    auto idx = 0;

    FOR_SECTIONS() {
        CHECK(sect->size < 32000, 1014);
        CHECK(sect->size >= 16, 1048);

        if (sect->type == SectionType::InfoHeader) {
            CHECK(sect->size >= sizeof(VMImageHeader), 1008);
            auto hd = (VMImageHeader *)sect->data;
            CHECK(hd->magic0 == VM_MAGIC0, 1009);
            CHECK(hd->magic1 == VM_MAGIC1, 1010);
            CHECK(hd->allocGlobals >= hd->nonPointerGlobals, 1011);
            CHECK(hd->allocGlobals < 10000, 1012);
            CHECK(idx == 0, 1013);
            img->infoHeader = hd;
        }

        if (sect->type == SectionType::OpCodeMap) {
            CHECK(img->opcodes == NULL, 1015);
            auto curr = sect->data;
            auto endp = sect->data + sect->size - 8;
            CHECK(endp[-1] == 0, 1017);

            while (curr < endp) {
                if (*curr == 0)
                    img->numOpcodes++;
                curr++;
            }
            CHECK(img->numOpcodes >= VM_FIRST_RTCALL, 1016);

            img->opcodes = ALLOC_ARRAY(OpFun, img->numOpcodes);
            img->opcodeDescs = ALLOC_ARRAY(const OpcodeDesc *, img->numOpcodes);

            int i = 0;
            curr = sect->data;
            while (curr < endp) {
                img->opcodeDescs[i] = NULL;
                img->opcodes[i] = NULL;
                if (*curr) {
                    for (auto st = staticOpcodes; st->name; st++) {
                        if (strcmp(st->name, (const char *)curr) == 0) {
                            img->opcodeDescs[i] = st;
                            break;
                        }
                    }
                    if (img->opcodeDescs[i] == NULL) {
                        DMESG("missing opcode: %s", (const char *)curr);
                        setVMImgError(img, 1018, curr);
                    } else {
                        img->opcodes[i] = img->opcodeDescs[i]->fn;
                    }
                }
                while (*curr)
                    curr++;
                curr++;
                i++;
            }
            if (img->errorCode)
                return img;
        }

        if (sect->type == SectionType::NumberLiterals) {
            CHECK(!img->numberLiterals, 1004);
            img->numNumberLiterals = (sect->size >> 3) - 1;
            uint64_t *values = (uint64_t *)sect->data;

#ifdef PXT64
            img->numberLiterals = (TValue *)values;
#else
            img->numberLiterals = ALLOC_ARRAY(TValue, img->numNumberLiterals);
#endif

            for (unsigned i = 0; i < img->numNumberLiterals; ++i) {
                auto ptr = &values[i];
                auto v = *ptr;
                if (isEncodedDouble(v))
                    CHECK_AT(!isnan(decodeDouble(v)), 1005, ptr);
                else if (v & 1)
                    CHECK_AT((v >> 1) <= 0xffffffff, 1006, ptr);
                else if (v == 0) {
                    // OK - padding probably
                } else
                    CHECK_AT(false, 1007, ptr);
#ifdef PXT32
                img->numberLiterals[i] =
                    v == 0 ? 0 : isEncodedDouble(v) ? fromDouble(decodeDouble(v)) : fromInt(v >> 1);
#endif
            }
        }

        if (sect->type == SectionType::ConfigData) {
            img->numConfigDataEntries = (sect->size - 8) >> 3;
            img->configData = (int32_t *)sect->data;
            CHECK(img->configData[(img->numConfigDataEntries - 1) * 2] == 0, 1045);
        }

        img->sections[idx] = sect;

        if (sect->type == SectionType::Literal) {
            if (sect->aux == (int)BuiltInType::BoxedString ||
                sect->aux == (int)BuiltInType::BoxedBuffer) {
                auto str = (CompiledString *)sect->data;
                CHECK(sect->size >= str->numbytes + 8 + 4, 1042);
                auto v = sect->aux == (int)BuiltInType::BoxedString
                             ? (TValue)mkString(str->utf8data, str->numbytes)
                             : (TValue)mkBuffer((uint8_t *)str->utf8data, str->numbytes);
                // registerGCPtr(v);
                img->pointerLiterals[idx] = v;
            } else {
                CHECK(0, 1050);
            }
        } else if (sect->type == SectionType::Function || sect->type == SectionType::VTable) {
            img->pointerLiterals[idx] = (TValue)sect;
        } else {
            img->pointerLiterals[idx] = nullptr;
        }

        idx++;
    }

    CHECK_AT(img->infoHeader != NULL, 1019, 0);
    CHECK_AT(img->opcodes != NULL, 1020, 0);
    CHECK_AT(img->numberLiterals != NULL, 1021, 0);
    CHECK_AT(img->configData != NULL, 1022, 0);

    return NULL;
}

static VMImage *loadIfaceNames(VMImage *img) {
    FOR_SECTIONS() {
        if (sect->type == SectionType::IfaceMemberNames) {
            uint64_t *ptrs = (uint64_t *)sect->data;
            uintptr_t *dst = (uintptr_t *)ptrs;
            img->ifaceMemberNames = dst;
            auto len = *ptrs++;
            img->numIfaceMemberNames = (uint32_t)len;
            *dst++ = len;
            CHECK(sect->size >= 16 + len * 8, 1047);
            for (unsigned i = 0; i < len; ++i) {
                CHECK(ptrs[i] < img->numSections, 1051);
                auto ss = img->sections[ptrs[i]];
                CHECK(ss->type == SectionType::Literal &&
                          (BuiltInType)ss->aux == BuiltInType::BoxedString,
                      1052);
                dst[i] = (uintptr_t)img->pointerLiterals[ptrs[i]];
                // pointers have to be sorted
                CHECK(i == 0 || dst[i - 1] < dst[i], 1053);
                // and so strings
                CHECK(i == 0 || String_::compare((String)dst[i - 1], (String)dst[i]) < 0, 1054);
            }
        }
    }

    return NULL;
}

void validateFunction(VMImage *img, VMImageSection *sect, int debug);

static VMImage *validateFunctions(VMImage *img) {
    FOR_SECTIONS() {
        if (sect->type == SectionType::VTable) {
            uint8_t *endp = sect->data + sect->size - 8;
            auto vt = (VTable *)sect->data;
            auto multBase = (uint16_t *)&vt->methods[VM_NUM_CPP_METHODS];
            CHECK((uint8_t *)multBase < endp,
                  1023); // basic size check, before dereferencing anything

            auto maxMult = 0xffffffffU >> (vt->ifaceHashMult & 0xff);

            CHECK(vt->numbytes < 1024, 1024);
            CHECK((vt->numbytes & 7) == 0, 1025);
            CHECK(vt->objectType == ValType::Object, 1026);
            CHECK(vt->magic == VTABLE_MAGIC, 1027);
            CHECK(vt->ifaceHashEntries > maxMult + 3, 1028);
            CHECK((uint8_t *)(multBase + vt->ifaceHashEntries) < endp, 1029);
            CHECK(vt->reserved == 0, 1030);
            CHECK(vt->ifaceHashMult != 0, 1031);
            CHECK((vt->ifaceHashEntries & 3) == 0, 1032);
            CHECK((int)vt->classNo >= (int)BuiltInType::User0, 1055);
            CHECK((int)vt->lastClassNo >= (int)vt->classNo, 1056);

            uint32_t maxOff = 0;
            uint32_t minOff = 0xfffffff;
            for (unsigned i = 0; i < vt->ifaceHashEntries; ++i) {
                uint32_t off2 = multBase[i];
                if (off2 > maxOff)
                    maxOff = off2;
                if (off2 < minOff)
                    minOff = off2;
                auto ent = (IfaceEntry *)multBase + off2;
                CHECK((uint8_t *)(ent + 1) <= endp, 1033);
            }

            CHECK(minOff * sizeof(IfaceEntry) == vt->ifaceHashEntries * 2, 1034);

            auto last1 = (IfaceEntry *)multBase + maxOff + 1;
            if (last1->memberId != 0)
                maxOff++;

            for (unsigned i = minOff; i <= maxOff; ++i) {
                auto ent = (IfaceEntry *)multBase + i;
                if (ent->memberId == 0)
                    continue;
                if (ent->aux == 0) {
                    CHECK(ent->method < img->numSections, 1037);
                    auto fn = img->sections[ent->method];
                    CHECK(fn->type == SectionType::Function, 1039);
                } else {
                    CHECK(ent->aux < (vt->numbytes >> 3), 1035);
                    CHECK(ent->aux == ent->method, 1036);
                }
            }

            auto p = (uint8_t *)((IfaceEntry *)multBase + maxOff + 1);
            while (p < endp)
                CHECK(*p++ == 0, 1040);
        }

        if (sect->type == SectionType::Function) {
            validateFunction(img, sect, 0);
            if (img->errorCode) {
                // try again with debug
                validateFunction(img, sect, 1);
                return img;
            }
        }
    }
    return NULL;
}

static VMImage *injectVTables(VMImage *img) {
    // this is the last FOR_SECTIONS() that will ever work
    FOR_SECTIONS() {
        if (sect->type == SectionType::Literal) {
            switch ((BuiltInType)sect->aux) {
            case BuiltInType::BoxedString:
            case BuiltInType::BoxedBuffer:
                break;
            default:
                CHECK(0, 1043);
                break;
            }
        } else if (sect->type == SectionType::Function) {
            if (!img->entryPoint)
                img->entryPoint = (RefAction *)sect;
            ((RefAction *)sect)->vtable = PXT_VTABLE_TO_INT(&RefAction_vtable);
            ((RefAction *)sect)->func = (ActionCB)((uint8_t *)sect + VM_FUNCTION_CODE_OFFSET);
        } else if (sect->type == SectionType::VTable) {
            auto vt = (VTable *)sect->data;
            vt->methods[0] = (void *)pxt::RefRecord_destroy;
            vt->methods[1] = (void *)pxt::RefRecord_print;
            vt->methods[2] = (void *)pxt::RefRecord_scan;
            vt->methods[3] = (void *)pxt::RefRecord_gcsize;
        }
    }
    return NULL;
}

VMImage *loadVMImage(void *data, unsigned length) {
    auto img = new VMImage();
    memset(img, 0, sizeof(*img));

    DMESG("loading image at %p (%d bytes)", data, length);

    CHECK_AT(ALIGNED((uintptr_t)data), 1000, 0);
    CHECK_AT(ALIGNED(length), 1001, 0);

    img->dataStart = (uint64_t *)data;
    img->dataEnd = (uint64_t *)((uint8_t *)data + length);

    if (countSections(img) || loadSections(img) || loadIfaceNames(img) || validateFunctions(img) ||
        injectVTables(img)) {
        // error!
        return img;
    }

    DMESG("image loaded");

    return img;
}

void unloadVMImage(VMImage *img) {
    if (!img)
        return;
    free(img->dataStart);
    memset(img, 0, sizeof(*img));
    delete img;
}

} // namespace pxt

#ifndef __PXTCORE_H
#define __PXTCORE_H

#include "CodalDmesg.h"
#include "CodalHeapAllocator.h"

#define itoa(a, b) codal::itoa(a, b)

#define GC_GET_HEAP_SIZE() device_heap_size(0)
#define GC_STACK_BASE DEVICE_STACK_BASE
#define xmalloc device_malloc
#define xfree device_free

#define GC_MAX_ALLOC_SIZE (16 * 1024)

#endif

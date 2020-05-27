#include "pxt.h"
#include "SoundOutput.h"
#include "melody.h"

#include <alsa/asoundlib.h>
#include <pthread.h>

namespace music {

static void alsa_check(int pos, int fn) {
    if (fn < 0) {
        DMESG("alsa fail! pos=%d err=%d: %s", pos, fn, snd_strerror(fn));
        target_panic(950);
    }
}

void *LinuxDAC::play(void *self) {
    auto dac = (LinuxDAC *)self;

    snd_pcm_t *pcm_handle;

    sleep_core_us(1000 * 1000);

    alsa_check(0, snd_pcm_open(&pcm_handle, "default", SND_PCM_STREAM_PLAYBACK, 0));

    alsa_check(1, snd_pcm_set_params(pcm_handle, SND_PCM_FORMAT_S16_LE,
                                     SND_PCM_ACCESS_RW_INTERLEAVED, 1, SAMPLE_RATE, 1, 30 * 1000));

    DMESG("PCM name: '%s'", snd_pcm_name(pcm_handle));
    DMESG("PCM state: %s", snd_pcm_state_name(snd_pcm_state(pcm_handle)));

    for (;;) {
        target_disable_irq();
        auto hasData = dac->src.fillSamples(dac->data, sizeof(dac->data) / 2);
        target_enable_irq();
        auto len = (int)sizeof(dac->data) / 2;
        if (!hasData) {
            sleep_core_us(5000);
            continue;
        }
        for (int i = 0; i < len; ++i) {
            // playing at half-volume
            dac->data[i] = dac->data[i] << 3;
        }
        int frames = snd_pcm_writei(pcm_handle, dac->data, len);
        if (frames < 0)
            frames = snd_pcm_recover(pcm_handle, frames, 0);
        if (frames < 0) {
            DMESG("alsa write faield: %s", snd_strerror(frames));
            target_panic(951);
        }
    }

    return NULL;
}

LinuxDAC::LinuxDAC(WSynthesizer &data) : src(data) {
    pthread_t upd;
    pthread_create(&upd, NULL, LinuxDAC::play, this);
    pthread_detach(upd);
}

}
'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Download, ZoomIn, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintReadingButton } from '@/components/print-reading-button'

interface SectionData {
    id: string
    title: string
    photoUrl: string | null
    audioUrl: string | null
    interpretation: string
}

interface PhysicalReadingViewProps {
    readingTitle: string
    sections: SectionData[]
    readerName: string
    deliveredAt: string
}

export function PhysicalReadingView({
    readingTitle,
    sections,
    readerName,
    deliveredAt,
}: PhysicalReadingViewProps) {
    const [playingIdx, setPlayingIdx] = useState<number | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    const togglePlay = (idx: number, url: string) => {
        if (playingIdx === idx) {
            audioRef.current?.pause()
            setPlayingIdx(null)
            return
        }
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        }
        const audio = new Audio(url)
        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
        audio.onended = () => { setPlayingIdx(null); setCurrentTime(0) }
        audio.play()
        audioRef.current = audio
        setPlayingIdx(idx)
    }

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
    }

    return (
        <>
            {/* Zoom Modal */}
            {zoomedPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomedPhoto(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={zoomedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}

            <div className="min-h-screen bg-[#12100a] text-amber-50">
                {/* Hero */}
                <header className="relative px-6 pt-12 pb-8 text-center max-w-4xl mx-auto">
                    <div className="absolute top-8 right-8 no-print">
                        <PrintReadingButton />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Leitura Física
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {readingTitle || 'Sua Leitura'}
                    </h1>
                    <p className="text-sm text-amber-600">
                        Entregue em {new Date(deliveredAt).toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })} por <strong className="text-amber-400">{readerName}</strong>
                    </p>
                </header>

                {/* Content */}
                <main className="max-w-4xl mx-auto px-6 pb-16 space-y-12">
                    {sections.map((section, idx) => (
                        <div key={section.id} className="space-y-6">
                            {/* Section Photo */}
                            {section.photoUrl && (
                                <div className="relative rounded-2xl overflow-hidden border border-amber-700/20 shadow-2xl group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={section.photoUrl}
                                        alt={section.title}
                                        className="w-full max-h-[500px] object-contain bg-black"
                                    />
                                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                                            onClick={() => setZoomedPhoto(section.photoUrl)}
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </Button>
                                        <a
                                            href={section.photoUrl}
                                            download
                                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Section Audio */}
                            {section.audioUrl && (
                                <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-950/30 border border-amber-700/20">
                                    <Button
                                        size="icon"
                                        onClick={() => togglePlay(idx, section.audioUrl!)}
                                        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-black shrink-0 shadow-lg shadow-amber-500/20"
                                    >
                                        {playingIdx === idx
                                            ? <Pause className="w-6 h-6" />
                                            : <Play className="w-6 h-6 pl-0.5" />
                                        }
                                    </Button>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-amber-200">Interpretação em Áudio</p>
                                            {playingIdx === idx && (
                                                <span className="text-[10px] text-amber-600 font-mono">
                                                    {formatTime(currentTime)} / {formatTime(duration)}
                                                </span>
                                            )}
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-1.5 bg-amber-900/50 rounded-full overflow-hidden w-full">
                                            <div
                                                className="h-full bg-amber-500 rounded-full transition-all"
                                                style={{
                                                    width: playingIdx === idx && duration > 0
                                                        ? `${(currentTime / duration) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section Title + Text */}
                            {(section.title || section.interpretation) && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-3 border-b border-amber-700/20 pb-3">
                                        <span className="text-amber-600 text-sm font-mono">{String(idx + 1).padStart(2, '0')}.</span>
                                        {section.title.toUpperCase()}
                                    </h2>
                                    {section.interpretation && (
                                        <div className="text-sm text-amber-100/80 leading-relaxed whitespace-pre-wrap">
                                            {section.interpretation}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section Divider */}
                            {idx < sections.length - 1 && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-16 h-px bg-amber-700/30" />
                                    <Sparkles className="w-4 h-4 text-amber-700/40 mx-4" />
                                    <div className="w-16 h-px bg-amber-700/30" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Reader Footer */}
                    <div className="pt-8 border-t border-amber-700/20 text-center">
                        <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-amber-950/30 border border-amber-700/20">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-white">{readerName}</p>
                                <p className="text-[10px] text-amber-600">Taróloga • Isidis</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}

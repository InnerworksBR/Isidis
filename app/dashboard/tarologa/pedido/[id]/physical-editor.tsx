'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Camera, Mic, MicOff, Upload, Play, Pause, Trash2, Plus,
    Save, Send, Loader2, CheckCircle, ChevronLeft, GripVertical,
    Image as ImageIcon, FileAudio, Type, Sparkles, ClipboardList, X
} from 'lucide-react'
import { GigRequirement } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { savePhysicalDraft, sendPhysicalReading } from './actions'
import type { SpreadSection, PhysicalReadingContent } from './actions'
import { uploadReadingFile, uploadReadingBlob } from '@/lib/supabase/storage'

interface PhysicalEditorProps {
    order: {
        id: string
        status: string
        deliveryContent: any
        amountReaderNet: number
        createdAt: string
    }
    gigTitle: string
    clientName: string
    clientEmail: string
    readerName: string
    gigRequirements?: GigRequirement[]
    requirementsAnswers?: Record<string, string>
}

function generateId() {
    return Math.random().toString(36).substring(2, 10)
}

function createEmptySection(index: number): SpreadSection {
    return {
        id: generateId(),
        title: `Tiragem ${index + 1}`,
        photoUrl: null,
        audioUrl: null,
        interpretation: '',
    }
}

export function PhysicalEditor({
    order,
    gigTitle,
    clientName,
    clientEmail,
    readerName,
    gigRequirements = [],
    requirementsAnswers = {}
}: PhysicalEditorProps) {
    const router = useRouter()
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED'

    // Restore from draft or start fresh
    const existingContent = order.deliveryContent?.mode === 'physical'
        ? order.deliveryContent as PhysicalReadingContent
        : null

    const [readingTitle, setReadingTitle] = useState(existingContent?.readingTitle || '')
    const [sections, setSections] = useState<SpreadSection[]>(
        existingContent?.sections || [createEmptySection(0)]
    )

    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null) // section id
    const [uploadingAudio, setUploadingAudio] = useState<string | null>(null)
    const [recordingSection, setRecordingSection] = useState<string | null>(null)
    const [playingSection, setPlayingSection] = useState<string | null>(null)
    const [showConfirmSend, setShowConfirmSend] = useState(false)
    const [showRequirements, setShowRequirements] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    // ─── Helpers ──────────────────────────────────────────────────

    const updateSection = useCallback((id: string, updates: Partial<SpreadSection>) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }, [])

    const removeSection = useCallback((id: string) => {
        setSections(prev => prev.filter(s => s.id !== id))
    }, [])

    const addSection = useCallback(() => {
        setSections(prev => [...prev, createEmptySection(prev.length)])
    }, [])

    const buildContent = useCallback((): PhysicalReadingContent => ({
        mode: 'physical',
        readingTitle: readingTitle || gigTitle,
        sections,
    }), [readingTitle, sections, gigTitle])

    // ─── Photo Upload ─────────────────────────────────────────────

    const handlePhotoUpload = async (sectionId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', msg: 'Apenas imagens são aceitas.' })
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: 'error', msg: 'Imagem muito grande (máx. 10MB).' })
            return
        }

        setUploadingPhoto(sectionId)
        const { url, error } = await uploadReadingFile(order.id, sectionId, file)
        setUploadingPhoto(null)

        if (error || !url) {
            setFeedback({ type: 'error', msg: 'Erro ao enviar foto.' })
            return
        }

        updateSection(sectionId, { photoUrl: url })
        setFeedback({ type: 'success', msg: 'Foto enviada!' })
        setTimeout(() => setFeedback(null), 2000)
    }

    const handlePhotoDrop = (sectionId: string, e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handlePhotoUpload(sectionId, file)
    }

    // ─── Audio Recording ──────────────────────────────────────────

    const startRecording = async (sectionId: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

                setUploadingAudio(sectionId)
                const { url, error } = await uploadReadingBlob(
                    order.id, sectionId, blob, `audio_${Date.now()}.webm`
                )
                setUploadingAudio(null)

                if (url) {
                    updateSection(sectionId, { audioUrl: url })
                    setFeedback({ type: 'success', msg: 'Áudio salvo!' })
                    setTimeout(() => setFeedback(null), 2000)
                } else {
                    setFeedback({ type: 'error', msg: 'Erro ao salvar áudio.' })
                }
            }

            mediaRecorder.start()
            mediaRecorderRef.current = mediaRecorder
            setRecordingSection(sectionId)
        } catch {
            setFeedback({ type: 'error', msg: 'Não foi possível acessar o microfone.' })
        }
    }

    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
        setRecordingSection(null)
    }

    const handleAudioFileUpload = async (sectionId: string, file: File) => {
        if (!file.type.startsWith('audio/')) {
            setFeedback({ type: 'error', msg: 'Apenas arquivos de áudio são aceitos.' })
            return
        }
        if (file.size > 50 * 1024 * 1024) {
            setFeedback({ type: 'error', msg: 'Áudio muito grande (máx. 50MB).' })
            return
        }

        setUploadingAudio(sectionId)
        const { url, error } = await uploadReadingFile(order.id, sectionId, file)
        setUploadingAudio(null)

        if (url) {
            updateSection(sectionId, { audioUrl: url })
            setFeedback({ type: 'success', msg: 'Áudio enviado!' })
            setTimeout(() => setFeedback(null), 2000)
        } else {
            setFeedback({ type: 'error', msg: 'Erro ao enviar áudio.' })
        }
    }

    // ─── Playback ─────────────────────────────────────────────────

    const togglePlay = (sectionId: string, audioUrl: string) => {
        if (playingSection === sectionId) {
            audioRef.current?.pause()
            setPlayingSection(null)
            return
        }
        if (audioRef.current) audioRef.current.pause()
        const audio = new Audio(audioUrl)
        audio.onended = () => setPlayingSection(null)
        audio.play()
        audioRef.current = audio
        setPlayingSection(sectionId)
    }

    // ─── Save / Send ──────────────────────────────────────────────

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        const result = await savePhysicalDraft(order.id, buildContent())
        setSaving(false)
        if (result.error) setFeedback({ type: 'error', msg: result.error })
        else {
            setFeedback({ type: 'success', msg: 'Rascunho salvo!' })
            setTimeout(() => setFeedback(null), 3000)
        }
    }

    const handleSend = async () => {
        setShowConfirmSend(true)
    }

    const confirmSend = async () => {
        setShowConfirmSend(false)
        setSending(true)
        setFeedback(null)
        const result = await sendPhysicalReading(order.id, buildContent())
        setSending(false)
        if (result.error) {
            setFeedback({ type: 'error', msg: result.error })
        } else {
            setFeedback({ type: 'success', msg: 'Leitura enviada com sucesso!' })
            setTimeout(() => router.push('/dashboard/tarologa'), 2000)
        }
    }

    // ─── Word Count ───────────────────────────────────────────────

    const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0

    // ─── Render ───────────────────────────────────────────────────

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-[#1a1506] text-amber-50">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-amber-800/30 bg-[#1a1506]/95 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-amber-400">Isidis</span>
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[10px]">
                        PRO EDITOR
                    </Badge>
                </div>
                <div className="flex items-center gap-3">
                    {gigRequirements.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRequirements(true)}
                            className="text-amber-300 hover:text-amber-100 hover:bg-amber-900/30 gap-2"
                        >
                            <ClipboardList className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver Respostas</span>
                        </Button>
                    )}
                    {feedback && (
                        <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${feedback.type === 'success'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                            }`}>
                            <CheckCircle className="w-3 h-3" />
                            {feedback.msg}
                        </div>
                    )}
                    {!isDelivered && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSave}
                                disabled={saving || sending}
                                className="text-amber-300 hover:text-amber-100 hover:bg-amber-900/30"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Rascunho
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={saving || sending || sections.length === 0}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar Leitura
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Inline Confirmation Panel */}
            {showConfirmSend && (
                <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 backdrop-blur-sm px-6 py-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in duration-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-50">Confirmar Entrega</p>
                            <p className="text-xs text-amber-400/70">
                                A leitura será enviada para <strong className="text-amber-300">{clientName}</strong> e o pedido será marcado como entregue.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmSend(false)}
                            className="text-amber-300 hover:text-amber-100 hover:bg-amber-900/30"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={confirmSend}
                            disabled={sending}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2 rounded-lg"
                        >
                            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Confirmar e Enviar
                        </Button>
                    </div>
                </div>
            )}

            {/* Requirements Modal */}
            {showRequirements && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-[#1a1506] border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-amber-500/20 bg-amber-950/30">
                            <h3 className="text-lg font-bold text-amber-50 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-amber-400" />
                                Respostas do Cliente
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowRequirements(false)}
                                className="w-8 h-8 rounded-full hover:bg-amber-900/30 text-amber-400"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            {gigRequirements.map((req, i) => (
                                <div key={req.id} className="space-y-2">
                                    <p className="text-sm font-medium text-amber-200">
                                        {i + 1}. {req.question}
                                    </p>
                                    <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-700/20 text-amber-100 text-sm whitespace-pre-wrap">
                                        {requirementsAnswers[req.id] || <span className="text-amber-700 italic">Não respondido</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
                    {/* Order Info */}
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="text-xs text-amber-600 hover:text-amber-400 flex items-center gap-1 mb-2"
                        >
                            <ChevronLeft className="w-3 h-3" /> Pedidos
                        </button>
                        <h1 className="text-2xl font-bold text-amber-50">
                            Entrega para {clientName}
                        </h1>
                        <p className="text-sm text-amber-600 mt-1">{gigTitle}</p>
                    </div>

                    {/* Reading Title */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2 block">
                            Título da Leitura
                        </label>
                        <Input
                            value={readingTitle}
                            onChange={e => setReadingTitle(e.target.value)}
                            placeholder="Ex: Tiragem da Cruz Celta, Caminho do Autoconhecimento..."
                            className="bg-amber-950/30 border-amber-700/30 text-amber-100 placeholder:text-amber-800 focus:border-amber-500 h-12 text-lg"
                            disabled={isDelivered}
                        />
                    </div>

                    {/* ─── Sections ──────────────────────────────────── */}
                    {sections.map((section, idx) => (
                        <div
                            key={section.id}
                            className="rounded-2xl border border-amber-700/20 bg-amber-950/20 overflow-hidden"
                        >
                            {/* Section Header */}
                            <div className="px-6 py-4 border-b border-amber-700/20 flex items-center justify-between bg-amber-950/30">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-amber-700 cursor-grab" />
                                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-black flex items-center justify-center text-sm font-bold">
                                        {idx + 1}
                                    </span>
                                    <Input
                                        value={section.title}
                                        onChange={e => updateSection(section.id, { title: e.target.value })}
                                        className="bg-transparent border-none text-lg font-bold text-amber-100 p-0 h-auto focus-visible:ring-0 max-w-xs"
                                        disabled={isDelivered}
                                    />
                                </div>
                                {!isDelivered && sections.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSection(section.id)}
                                        className="text-amber-700 hover:text-red-400 hover:bg-red-950/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="p-6 space-y-6">
                                {/* ── Photo Upload ─────────────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                                        <ImageIcon className="w-4 h-4" />
                                        Foto da Mesa
                                        <span className="text-[10px] font-normal text-amber-700 ml-auto">JPG/PNG até 10MB</span>
                                    </h4>
                                    {section.photoUrl ? (
                                        <div className="relative group rounded-xl overflow-hidden border border-amber-700/30">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={section.photoUrl}
                                                alt={section.title}
                                                className="w-full max-h-[400px] object-contain bg-black"
                                            />
                                            {!isDelivered && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-amber-500 text-amber-400"
                                                        onClick={() => fileInputRefs.current[`photo-${section.id}`]?.click()}
                                                    >
                                                        Trocar Foto
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-500 text-red-400"
                                                        onClick={() => updateSection(section.id, { photoUrl: null })}
                                                    >
                                                        Remover
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${uploadingPhoto === section.id
                                                ? 'border-amber-500 bg-amber-950/40'
                                                : 'border-amber-700/30 hover:border-amber-500/60 hover:bg-amber-950/20'
                                                }`}
                                            onClick={() => !isDelivered && fileInputRefs.current[`photo-${section.id}`]?.click()}
                                            onDrop={e => !isDelivered && handlePhotoDrop(section.id, e)}
                                            onDragOver={e => e.preventDefault()}
                                        >
                                            {uploadingPhoto === section.id ? (
                                                <Loader2 className="w-10 h-10 mx-auto text-amber-500 animate-spin mb-3" />
                                            ) : (
                                                <Camera className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                                            )}
                                            <p className="text-sm text-amber-400 font-bold">
                                                {uploadingPhoto === section.id ? 'Enviando...' : 'Arraste a foto ou clique para selecionar'}
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                Foto real da sua mesa de trabalho
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        ref={el => { fileInputRefs.current[`photo-${section.id}`] = el }}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (file) handlePhotoUpload(section.id, file)
                                            e.target.value = ''
                                        }}
                                    />
                                </div>

                                {/* ── Audio ─────────────────────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                                        <FileAudio className="w-4 h-4" />
                                        Interpretação em Áudio
                                    </h4>

                                    {section.audioUrl ? (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-700/20">
                                            <Button
                                                size="icon"
                                                onClick={() => togglePlay(section.id, section.audioUrl!)}
                                                className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                                            >
                                                {playingSection === section.id
                                                    ? <Pause className="w-5 h-5" />
                                                    : <Play className="w-5 h-5 pl-0.5" />
                                                }
                                            </Button>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-amber-200">Áudio gravado</p>
                                                <p className="text-xs text-amber-600">Clique para ouvir</p>
                                            </div>
                                            {!isDelivered && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateSection(section.id, { audioUrl: null })}
                                                    className="text-amber-700 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Upload button */}
                                            <div
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${uploadingAudio === section.id
                                                    ? 'border-amber-500 bg-amber-950/40'
                                                    : 'border-amber-700/20 bg-amber-950/20 hover:border-amber-500/40'
                                                    }`}
                                                onClick={() => !isDelivered && fileInputRefs.current[`audio-${section.id}`]?.click()}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                                    {uploadingAudio === section.id
                                                        ? <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                                        : <Upload className="w-5 h-5 text-amber-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-amber-200">Enviar Gravação</p>
                                                    <p className="text-[10px] text-amber-700">MP3, WAV até 50MB</p>
                                                </div>
                                            </div>

                                            {/* Record button */}
                                            <div
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${recordingSection === section.id
                                                    ? 'border-red-500 bg-red-950/30 animate-pulse'
                                                    : 'border-amber-700/20 bg-amber-950/20 hover:border-red-500/40'
                                                    }`}
                                                onClick={() => {
                                                    if (isDelivered) return
                                                    recordingSection === section.id
                                                        ? stopRecording()
                                                        : startRecording(section.id)
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${recordingSection === section.id ? 'bg-red-500' : 'bg-red-500/20'
                                                    }`}>
                                                    {recordingSection === section.id
                                                        ? <MicOff className="w-5 h-5 text-white" />
                                                        : <Mic className="w-5 h-5 text-red-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-amber-200">
                                                        {recordingSection === section.id ? 'Parar Gravação' : 'Gravar Agora'}
                                                    </p>
                                                    <p className="text-[10px] text-amber-700 flex items-center gap-1">
                                                        {recordingSection === section.id
                                                            ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Gravando...</>
                                                            : 'Captura ao vivo no navegador'
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <input
                                                ref={el => { fileInputRefs.current[`audio-${section.id}`] = el }}
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleAudioFileUpload(section.id, file)
                                                    e.target.value = ''
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ── Written Interpretation ────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                                        <Type className="w-4 h-4" />
                                        Interpretação Escrita
                                    </h4>
                                    <div className="relative">
                                        <textarea
                                            value={section.interpretation}
                                            onChange={e => updateSection(section.id, { interpretation: e.target.value })}
                                            placeholder="Escreva sua interpretação intuitiva aqui. Mencione as cartas específicas da foto..."
                                            rows={8}
                                            disabled={isDelivered}
                                            className="w-full rounded-xl border border-amber-700/30 bg-amber-950/30 text-amber-100 placeholder:text-amber-800 p-4 text-sm leading-relaxed resize-y focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                                            maxLength={14000}
                                        />
                                        <p className={`text-[10px] text-right mt-1 ${wordCount(section.interpretation) >= 1900 ? 'text-red-400' : 'text-amber-700'}`}>
                                            {wordCount(section.interpretation)} palavras / 2.000 máx
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Section Button */}
                    {!isDelivered && (
                        <button
                            onClick={addSection}
                            className="w-full py-4 rounded-xl border-2 border-dashed border-amber-700/30 hover:border-amber-500/50 text-amber-500 hover:text-amber-400 flex items-center justify-center gap-2 transition-all hover:bg-amber-950/20"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm font-bold">Adicionar Tiragem</span>
                        </button>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-amber-700/20 bg-[#1a1506]/95 backdrop-blur-xl px-6 py-3 flex items-center justify-between text-xs text-amber-700">
                <div className="flex items-center gap-4">
                    {isDelivered ? (
                        <span className="flex items-center gap-1.5 text-green-500">
                            <CheckCircle className="w-3 h-3" /> Entregue
                        </span>
                    ) : (
                        <span>Cliente verá: Modo Mesa Física</span>
                    )}
                </div>
                <span>{sections.length} tiragem(ns)</span>
            </footer>
        </div>
    )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { createPixPayment, checkPaymentStatus } from '@/app/(website)/checkout/actions'
import { Loader2, Copy, CheckCircle2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { logAnalyticsEvent } from '@/app/actions/analytics'
import { GigAddOn } from '@/types'

interface PixData {
    qrcode: string
    content: string
    pixId: string
    devMode?: boolean
}

export function CheckoutForm({ gigId, readerId, selectedAddOns = [] }: { gigId: string, readerId: string, selectedAddOns?: GigAddOn[] }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [pixData, setPixData] = useState<PixData | null>(null)
    const [orderId, setOrderId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const router = useRouter()
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Polling for payment status every 5 seconds
    useEffect(() => {
        if (!orderId || !pixData?.pixId) return

        const startPolling = () => {
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const result = await checkPaymentStatus(pixData.pixId, orderId)
                    if (result.status === 'PAID') {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                        toast.success('Pagamento confirmado!')
                        router.push(`/checkout/success?order_id=${orderId}`)
                    }
                } catch (err) {
                    console.error('Error polling payment status:', err)
                }
            }, 5000)
        }

        startPolling()

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        }
    }, [orderId, pixData?.pixId, router])

    const handleCheckout = async () => {
        setLoading(true)
        setError('')
        try {
            logAnalyticsEvent(gigId, readerId, 'click_buy')
            const result = await createPixPayment(gigId, selectedAddOns.map(a => a.id))

            if (result.error) {
                setError(result.error)
                if (result.needsProfile) {
                    toast.error(result.error)
                    // Optionally redirect to profile settings
                }
            } else if (result.qrcode && result.content && result.orderId && result.pixId) {
                setPixData({
                    qrcode: result.qrcode,
                    content: result.content.trim(),
                    pixId: result.pixId,
                    devMode: result.devMode
                })
                setOrderId(result.orderId)
                toast.success('PIX gerado com sucesso!')
            }
        } catch (err) {
            setError('Ocorreu um erro ao processar o pagamento.')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (pixData?.content) {
            navigator.clipboard.writeText(pixData.content)
            setCopied(true)
            toast.success('Código PIX copiado!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (pixData) {
        return (
            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 text-center space-y-4">
                    {pixData.devMode && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-[10px] font-bold uppercase tracking-wider mb-2">
                            MODO TESTE / SANDBOX
                        </div>
                    )}
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-xl shadow-lg">
                            <img
                                src={pixData.qrcode}
                                alt="PIX QR Code"
                                className="w-48 h-48"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-400">Escaneie o QR Code ou copie o código abaixo</p>
                        <div className="relative group">
                            <textarea
                                readOnly
                                value={pixData.content}
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none focus:outline-none"
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={copyToClipboard}
                                className="absolute bottom-2 right-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                <span className="ml-2">{copied ? 'Copiado' : 'Copiar'}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm font-medium animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Aguardando pagamento...
                    </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs">
                    <p>O seu pedido será confirmado automaticamente assim que o pagamento for processado. Não feche esta página até a confirmação.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-scale-in">
                    {error}
                </div>
            )}
            <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-6 text-lg font-bold rounded-xl animate-glow-pulse bg-indigo-600 hover:bg-indigo-700"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Gerando PIX...
                    </>
                ) : (
                    <>
                        <QrCode className="mr-2 h-5 w-5" />
                        Pagar com PIX
                    </>
                )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
                Pagamento processado de forma segura pelo Abacate Pay.
            </p>
        </div>
    )
}

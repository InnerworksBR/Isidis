'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { signup } from '@/app/auth/actions'
import Link from 'next/link'
import { Sparkles, Eye, Loader2, MapPin, CreditCard, Upload, Check, X, AlertCircle } from 'lucide-react'
import { validateCPF } from '@/lib/utils'

// Specialties List
const PREDEFINED_SPECIALTIES = [
    "Tarot de Marselha", "Tarot Rider-Waite", "Baralho Cigano",
    "Astrologia", "Numerologia", "Clarividência",
    "Búzios", "Runas", "Cristaloterapia",
    "Reiki", "Pendulo", "Tarot dos Anjos"
]

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(signup, null)
    const [step, setStep] = useState(1)
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [specialties, setSpecialties] = useState<string[]>([])

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        social_name: '',
        cpf: '',
        birth_date: '',
        cellphone: '',
        address_zip_code: '',
        address_street: '',
        address_number: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        bank_code: '',
        agency: '',
        account_number: '',
        account_type: 'CHECKING',
        bio: '',
        ethics_accepted: false,
        confirm_password: '',
        // File tracking state (for validation only, not submission)
        has_doc_front: false,
        has_doc_back: false,
        has_doc_selfie: false
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const [isLoadingCep, setIsLoadingCep] = useState(false)

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '')
        if (cep.length !== 8) return

        setIsLoadingCep(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await response.json()

            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address_street: data.logradouro,
                    address_neighborhood: data.bairro,
                    address_city: data.localidade,
                    address_state: data.uf
                }))
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error)
        } finally {
            setIsLoadingCep(false)
        }
    }

    const toggleSpecialty = (spec: string) => {
        setSpecialties(prev =>
            prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
        )
    }

    const validatePassword = (password: string) => {
        const minLength = 8
        const hasUpperCase = /[A-Z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

        return {
            isValid: password.length >= minLength && hasUpperCase && hasNumber && hasSpecialChar,
            checks: {
                minLength: password.length >= minLength,
                hasUpperCase,
                hasNumber,
                hasSpecialChar
            }
        }
    }

    const validateStep = (currentStep: number) => {
        if (currentStep === 2) {
            if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
                alert("Por favor, preencha todos os campos obrigatórios.")
                return false
            }

            if (formData.password !== formData.confirm_password) {
                alert("As senhas não coincidem.")
                return false
            }

            if (!validatePassword(formData.password).isValid) {
                alert("A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.")
                return false
            }

            if (selectedRole === 'READER' && !formData.social_name) {
                alert("Por favor, preencha o seu Nome Místico.")
                return false
            }
            if (selectedRole === 'CLIENT' && (!formData.cpf || !formData.cellphone)) {
                alert("Por favor, preencha o seu CPF e Celular.")
                return false
            }

            if (formData.cpf && !validateCPF(formData.cpf)) {
                setErrors(prev => ({ ...prev, cpf: "O CPF informado é inválido." }))
                return false
            } else {
                setErrors(prev => {
                    const next = { ...prev }
                    delete next.cpf
                    return next
                })
            }
        }
        if (currentStep === 3) { // Reader Personal
            if (!formData.cpf || !formData.birth_date || !formData.cellphone) {
                alert("Preencha todos os campos obrigatórios.")
                return false
            }
            if (formData.cpf && !validateCPF(formData.cpf)) {
                setErrors(prev => ({ ...prev, cpf: "O CPF informado é inválido." }))
                return false
            } else {
                setErrors(prev => {
                    const next = { ...prev }
                    delete next.cpf
                    return next
                })
            }
            if (!formData.address_zip_code || !formData.address_street || !formData.address_number) {
                alert("Preencha o seu endereço completo.")
                return false
            }
        }
        if (currentStep === 4) { // Reader Docs
            if (!formData.has_doc_front || !formData.has_doc_back || !formData.has_doc_selfie) return false
        }
        return true
    }

    const passwordValidation = validatePassword(formData.password)
    const passwordsMatch = formData.password === formData.confirm_password
    const showPasswordErrors = formData.password.length > 0
    const showConfirmError = formData.confirm_password.length > 0 && !passwordsMatch

    const nextStep = () => {
        if (!validateStep(step)) {
            alert("Por favor, preencha todos os campos obrigatórios.")
            return
        }
        setStep(prev => prev + 1)
    }
    const prevStep = () => setStep(prev => prev - 1)

    const handleFormSubmit = (e: React.FormEvent) => {
        if (selectedRole === 'CLIENT') {
            if (!validateStep(2)) {
                e.preventDefault()
            }
        } else {
            // Reader: prevent submit on Enter if not on final step
            if (step !== 5) {
                e.preventDefault()
            }
        }
    }

    // Masks
    const formatCpf = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }
    const formatPhone = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 11)
        if (d.length <= 2) return d.length ? `(${d}` : ''
        if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    }

    const handleRoleSelect = (role: string) => {
        setSelectedRole(role)
        setStep(2)
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-primary w-96 h-96 -top-48 -left-48 animate-float" />
            <div className="orb orb-accent w-72 h-72 -bottom-36 -right-36 animate-float-slow" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Progress indicator (Only for Readers) */}
                {selectedRole === 'READER' && step > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in text-xs text-muted-foreground">
                        <span className={step >= 2 ? "text-primary font-bold" : ""}>Conta</span>
                        <div className="w-4 h-0.5 bg-border" />
                        <span className={step >= 3 ? "text-primary font-bold" : ""}>Dados</span>
                        <div className="w-4 h-0.5 bg-border" />
                        <span className={step >= 4 ? "text-primary font-bold" : ""}>Docs</span>
                        <div className="w-4 h-0.5 bg-border" />
                        <span className={step >= 5 ? "text-primary font-bold" : ""}>Perfil</span>
                    </div>
                )}

                <form action={formAction} onSubmit={handleFormSubmit} className="bg-card/30 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <input type="hidden" name="role" value={selectedRole || 'CLIENT'} />
                    <input type="hidden" name="specialties" value={JSON.stringify(specialties)} />

                    {/* Step 1: Role Selection */}
                    <div className={step === 1 ? "animate-fade-in-up" : "hidden"}>
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">Bem-vinda ao Isidis</h1>
                            <p className="text-muted-foreground">Escolha como você deseja participar.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <button
                                type="button"
                                onClick={() => handleRoleSelect('CLIENT')}
                                className="group relative p-8 rounded-2xl border-2 text-left transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
                            >
                                <Eye className="w-8 h-8 text-primary mb-4" />
                                <h3 className="text-lg font-bold mb-2">Quero Consultar</h3>
                                <p className="text-sm text-muted-foreground">Busco orientação espiritual.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleRoleSelect('READER')}
                                className="group relative p-8 rounded-2xl border-2 text-left transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-500/5"
                            >
                                <Sparkles className="w-8 h-8 text-purple-500 mb-4" />
                                <h3 className="text-lg font-bold mb-2">Sou Taróloga</h3>
                                <p className="text-sm text-muted-foreground">Quero oferecer minhas leituras.</p>
                            </button>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            Já tem conta? <Link href="/login" className="text-primary hover:underline">Entrar</Link>
                        </p>
                    </div>

                    {/* Step 2: Account Basics */}
                    <div className={step === 2 ? "space-y-4 animate-fade-in-up" : "hidden"}>
                        <h2 className="text-2xl font-bold mb-6">Criar Conta</h2>

                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input name="full_name" required value={formData.full_name} onChange={handleInputChange} placeholder="Seu nome" />
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" />
                        </div>

                        <div className="space-y-2">
                            <Label>Senha</Label>
                            <Input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Crie uma senha segura"
                                className={showPasswordErrors && !passwordValidation.isValid ? "border-red-500/50 focus-visible:ring-red-500" : ""}
                            />
                            {showPasswordErrors && (
                                <div className="space-y-1 mt-2 p-3 bg-muted/50 rounded-lg text-xs transition-all animate-fade-in-down">
                                    <p className="font-semibold text-muted-foreground mb-2">A senha deve conter:</p>
                                    <div className={`flex items-center gap-2 ${passwordValidation.checks.minLength ? 'text-green-500' : 'text-red-500'}`}>
                                        {passwordValidation.checks.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        <span>No mínimo 8 caracteres</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${passwordValidation.checks.hasUpperCase ? 'text-green-500' : 'text-red-500'}`}>
                                        {passwordValidation.checks.hasUpperCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        <span>Pelo menos uma letra maiúscula</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${passwordValidation.checks.hasNumber ? 'text-green-500' : 'text-red-500'}`}>
                                        {passwordValidation.checks.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        <span>Pelo menos um número</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${passwordValidation.checks.hasSpecialChar ? 'text-green-500' : 'text-red-500'}`}>
                                        {passwordValidation.checks.hasSpecialChar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        <span>Pelo menos um caractere especial</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Confirmar Senha</Label>
                            <Input
                                type="password"
                                name="confirm_password"
                                required
                                value={formData.confirm_password}
                                onChange={handleInputChange}
                                placeholder="Confirme sua senha"
                                className={showConfirmError ? "border-red-500/50 focus-visible:ring-red-500" : ""}
                            />
                            {showConfirmError && (
                                <div className="flex items-center gap-2 text-red-500 text-xs animate-fade-in-down">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>As senhas não coincidem.</span>
                                </div>
                            )}
                        </div>

                        {selectedRole === 'READER' && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> Nome Místico</Label>
                                <Input name="social_name" required={selectedRole === 'READER'} value={formData.social_name} onChange={handleInputChange} placeholder="Ex: Taróloga Luna" />
                            </div>
                        )}

                        {selectedRole === 'CLIENT' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>CPF</Label>
                                    <Input
                                        name="cpf_client"
                                        required={selectedRole === 'CLIENT'}
                                        value={formData.cpf}
                                        onChange={(e) => {
                                            const val = formatCpf(e.target.value)
                                            setFormData(prev => ({ ...prev, cpf: val }))
                                            if (errors.cpf) setErrors(prev => {
                                                const next = { ...prev }
                                                delete next.cpf
                                                return next
                                            })
                                        }}
                                        placeholder="000.000.000-00"
                                        className={errors.cpf ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    {errors.cpf && <p className="text-xs text-red-500 animate-fade-in">{errors.cpf}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Celular</Label>
                                    <Input name="cellphone_client" required={selectedRole === 'CLIENT'} value={formData.cellphone} onChange={(e) => setFormData(prev => ({ ...prev, cellphone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="outline" onClick={prevStep}>Voltar</Button>
                            {selectedRole === 'CLIENT' ? (
                                <Button type="submit" className="flex-1" disabled={isPending}>
                                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Criar Conta'}
                                </Button>
                            ) : (
                                <Button type="button" className="flex-1" onClick={nextStep}>Próximo</Button>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Personal & Address (Reader Only) */}
                    <div className={(step === 3 && selectedRole === 'READER') ? "space-y-4 animate-fade-in-up" : "hidden"}>
                        <h2 className="text-2xl font-bold mb-6">Dados Pessoais</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>CPF</Label>
                                <Input
                                    name="cpf"
                                    required={selectedRole === 'READER'}
                                    value={formData.cpf}
                                    onChange={(e) => {
                                        const val = formatCpf(e.target.value)
                                        setFormData(prev => ({ ...prev, cpf: val }))
                                        if (errors.cpf) setErrors(prev => {
                                            const next = { ...prev }
                                            delete next.cpf
                                            return next
                                        })
                                    }}
                                    className={errors.cpf ? "border-red-500 focus-visible:ring-red-500" : ""}
                                />
                                {errors.cpf && <p className="text-xs text-red-500 animate-fade-in">{errors.cpf}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label>Data de Nascimento</Label>
                                <Input type="date" name="birth_date" required={selectedRole === 'READER'} value={formData.birth_date} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Celular (WhatsApp)</Label>
                            <Input name="cellphone" required={selectedRole === 'READER'} value={formData.cellphone} onChange={(e) => setFormData(prev => ({ ...prev, cellphone: formatPhone(e.target.value) }))} />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Endereço</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1 space-y-2">
                                    <Label>CEP</Label>
                                    <Input name="address_zip_code" required={selectedRole === 'READER'} value={formData.address_zip_code} onChange={handleInputChange} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Rua</Label>
                                    <Input name="address_street" required={selectedRole === 'READER'} value={formData.address_street} onChange={handleInputChange} />
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <Label>Número</Label>
                                    <Input name="address_number" required={selectedRole === 'READER'} value={formData.address_number} onChange={handleInputChange} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Bairro</Label>
                                    <Input name="address_neighborhood" required={selectedRole === 'READER'} value={formData.address_neighborhood} onChange={handleInputChange} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Cidade</Label>
                                    <Input name="address_city" required={selectedRole === 'READER'} value={formData.address_city} onChange={handleInputChange} />
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <Label>Estado</Label>
                                    <Input name="address_state" required={selectedRole === 'READER'} value={formData.address_state} onChange={handleInputChange} maxLength={2} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="outline" onClick={prevStep}>Voltar</Button>
                            <Button type="button" className="flex-1" onClick={nextStep}>Próximo</Button>
                        </div>
                    </div>

                    {/* Step 4: Documents (Reader Only) */}
                    <div className={(step === 4 && selectedRole === 'READER') ? "space-y-4 animate-fade-in-up" : "hidden"}>
                        <h2 className="text-2xl font-bold mb-6">Documentação</h2>
                        <p className="text-sm text-muted-foreground mb-4">Envie fotos legíveis do seu documento (RG ou CNH).</p>

                        <div className="space-y-4">
                            <div className={`border border-dashed rounded-lg p-6 text-center transition-colors ${formData.has_doc_front ? 'bg-green-500/10 border-green-500/50' : 'hover:bg-muted/30'}`}>
                                <Label htmlFor="doc_front" className="cursor-pointer block">
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${formData.has_doc_front ? 'text-green-500' : 'text-muted-foreground'}`} />
                                    <span className="block font-medium">{formData.has_doc_front ? 'Arquivo Selecionado' : 'Frente do Documento'}</span>
                                    <span className="text-xs text-muted-foreground">Clique para selecionar</span>
                                </Label>
                                <Input
                                    id="doc_front" name="doc_front" type="file" accept="image/*" className="hidden"
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_doc_front: !!e.target.files?.length }))}
                                />
                            </div>

                            <div className={`border border-dashed rounded-lg p-6 text-center transition-colors ${formData.has_doc_back ? 'bg-green-500/10 border-green-500/50' : 'hover:bg-muted/30'}`}>
                                <Label htmlFor="doc_back" className="cursor-pointer block">
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${formData.has_doc_back ? 'text-green-500' : 'text-muted-foreground'}`} />
                                    <span className="block font-medium">{formData.has_doc_back ? 'Arquivo Selecionado' : 'Verso do Documento'}</span>
                                    <span className="text-xs text-muted-foreground">Clique para selecionar</span>
                                </Label>
                                <Input
                                    id="doc_back" name="doc_back" type="file" accept="image/*" className="hidden"
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_doc_back: !!e.target.files?.length }))}
                                />
                            </div>

                            <div className={`border border-dashed rounded-lg p-6 text-center transition-colors ${formData.has_doc_selfie ? 'bg-green-500/10 border-green-500/50' : 'hover:bg-muted/30'}`}>
                                <Label htmlFor="doc_selfie" className="cursor-pointer block">
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${formData.has_doc_selfie ? 'text-green-500' : 'text-muted-foreground'}`} />
                                    <span className="block font-medium">{formData.has_doc_selfie ? 'Arquivo Selecionado' : 'Selfie com Documento'}</span>
                                    <span className="text-xs text-muted-foreground">Segure o documento ao lado do rosto</span>
                                </Label>
                                <Input
                                    id="doc_selfie" name="doc_selfie" type="file" accept="image/*" className="hidden"
                                    onChange={(e) => setFormData(prev => ({ ...prev, has_doc_selfie: !!e.target.files?.length }))}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="outline" onClick={prevStep}>Voltar</Button>
                            <Button type="button" className="flex-1" onClick={nextStep}>Próximo</Button>
                        </div>
                    </div>

                    {/* Step 5: Profile & Bank (Reader Only) */}
                    <div className={(step === 5 && selectedRole === 'READER') ? "space-y-4 animate-fade-in-up" : "hidden"}>
                        <h2 className="text-2xl font-bold mb-6">Perfil Profissional</h2>

                        <div className="space-y-2">
                            <Label>Biografia</Label>
                            <Textarea name="bio" required={selectedRole === 'READER'} value={formData.bio} onChange={handleInputChange} placeholder="Conte um pouco sobre sua experiência e estilo de leitura..." className="h-32" />
                        </div>

                        <div className="space-y-2">
                            <Label>Especialidades</Label>
                            <div className="flex flex-wrap gap-2">
                                {PREDEFINED_SPECIALTIES.map(spec => (
                                    <button
                                        key={spec}
                                        type="button"
                                        onClick={() => toggleSpecialty(spec)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${specialties.includes(spec) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                                    >
                                        {spec}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Dados Bancários</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Código Banco</Label>
                                    <Input name="bank_code" required={selectedRole === 'READER'} value={formData.bank_code} onChange={handleInputChange} placeholder="Ex: 001" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo Conta</Label>
                                    <select name="account_type" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.account_type} onChange={handleInputChange}>
                                        <option value="CHECKING">Corrente</option>
                                        <option value="SAVINGS">Poupança</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Agência</Label>
                                    <Input name="agency" required={selectedRole === 'READER'} value={formData.agency} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Conta</Label>
                                    <Input name="account_number" required={selectedRole === 'READER'} value={formData.account_number} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-4">
                            <input type="checkbox" id="terms" name="ethics_accepted" required={selectedRole === 'READER'} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">Concordo com os Termos de Uso e Código de Ética.</Label>
                        </div>

                        {state?.error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mt-4">
                                {state.error}
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="outline" onClick={prevStep}>Voltar</Button>
                            <Button type="submit" className="flex-1" disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Finalizar Cadastro'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

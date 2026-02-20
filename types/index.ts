export interface Profile {
    id: string
    full_name: string
    avatar_url?: string
    email?: string
    role: 'USER' | 'READER' | 'ADMIN'
    bio?: string
    specialties?: string[]
    verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
    experience_years?: number
    instagram_handle?: string
    cpf_cnpj?: string
    rating_average?: number
    reviews_count?: number
}

export interface GigRequirement {
    id: string
    question: string
    type: 'text' | 'choice'
    options?: string[]
    required: boolean
}

export interface Gig {
    id: string
    title: string
    description: string
    price: number
    image_url?: string
    slug: string
    owner_id: string
    created_at: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    owner?: Profile
    requirements?: GigRequirement[]
    add_ons?: GigAddOn[]
    category?: string
    delivery_time_hours?: number
    delivery_method?: string
    tags?: string[]
}

export interface GigAddOn {
    id: string
    title: string
    description?: string
    price: number
    type: 'SPEED' | 'EXTRA' | 'CUSTOM'
}

export interface Order {
    id: string
    gig_id: string
    client_id: string
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
    created_at: string
    gig?: Gig
    client?: Profile
    requirements_answers?: Record<string, string>
    selected_addons?: string[] // Array of AddOn IDs
}

export interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
    is_read: boolean
    order_id?: string
}

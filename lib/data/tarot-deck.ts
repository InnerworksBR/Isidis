export type TarotCard = {
    id: number
    name: string
    image: string
    meaning: string
}

// Major Arcana (22 cards) for the daily draw
export const MAJOR_ARCANA: TarotCard[] = [
    { id: 0, name: 'O Louco', image: '/tarot/0_the_fool.jpg', meaning: 'Novos comeÃ§os, aventura, inocÃªncia.' },
    { id: 1, name: 'O Mago', image: '/tarot/1_the_magician.jpg', meaning: 'ManifestaÃ§Ã£o, poder, aÃ§Ã£o criativa.' },
    { id: 2, name: 'A Sacerdotisa', image: '/tarot/2_high_priestess.jpg', meaning: 'IntuiÃ§Ã£o, mistÃ©rio, sabedoria interior.' },
    { id: 3, name: 'A Imperatriz', image: '/tarot/3_the_empress.jpg', meaning: 'Fertilidade, abundÃ¢ncia, natureza.' },
    { id: 4, name: 'O Imperador', image: '/tarot/4_the_emperor.jpg', meaning: 'Autoridade, estrutura, controle.' },
    { id: 5, name: 'O Hierofante', image: '/tarot/5_the_hierophant.jpg', meaning: 'TradiÃ§Ã£o, crenÃ§as, espiritualidade.' },
    { id: 6, name: 'Os Amantes', image: '/tarot/6_the_lovers.jpg', meaning: 'Amor, harmonia, escolhas.' },
    { id: 7, name: 'A Carruagem', image: '/tarot/7_the_chariot.jpg', meaning: 'Controle, forÃ§a de vontade, vitÃ³ria.' },
    { id: 8, name: 'A ForÃ§a', image: '/tarot/8_strength.jpg', meaning: 'Coragem, compaixÃ£o, forÃ§a interior.' },
    { id: 9, name: 'O Eremita', image: '/tarot/9_the_hermit.jpg', meaning: 'IntrospecÃ§Ã£o, solidÃ£o, guianÃ§a.' },
    { id: 10, name: 'A Roda da Fortuna', image: '/tarot/10_wheel_of_fortune.jpg', meaning: 'Sorte, karma, ciclos da vida.' },
    { id: 11, name: 'A JustiÃ§a', image: '/tarot/11_justice.jpg', meaning: 'JustiÃ§a, verdade, lei.' },
    { id: 12, name: 'O Enforcado', image: '/tarot/12_the_hanged_man.jpg', meaning: 'SacrifÃ­cio, deixar ir, novas perspectivas.' },
    { id: 13, name: 'A Morte', image: '/tarot/13_death.jpg', meaning: 'Fim, transformaÃ§Ã£o, transiÃ§Ã£o.' },
    { id: 14, name: 'A TemperanÃ§a', image: '/tarot/14_temperance.jpg', meaning: 'EquilÃ­brio, moderaÃ§Ã£o, paciÃªncia.' },
    { id: 15, name: 'O Diabo', image: '/tarot/15_the_devil.jpg', meaning: 'Sombra, apegos, sexualidade.' },
    { id: 16, name: 'A Torre', image: '/tarot/16_the_tower.jpg', meaning: 'Mudano repentina, caos, revelaÃ§Ã£o.' },
    { id: 17, name: 'A Estrela', image: '/tarot/17_the_star.jpg', meaning: 'EsperaÃ§a, fÃ©, renovaÃ§Ã£o.' },
    { id: 18, name: 'A Lua', image: '/tarot/18_the_moon.jpg', meaning: 'IlusÃ£o, medo, subconsciente.' },
    { id: 19, name: 'O Sol', image: '/tarot/19_the_sun.jpg', meaning: 'Positividade, sucesso, vitalidade.' },
    { id: 20, name: 'O Julgamento', image: '/tarot/20_judgement.jpg', meaning: 'Renascimento, chamado interior, absolviÃ§Ã£o.' },
    { id: 21, name: 'O Mundo', image: '/tarot/21_the_world.jpg', meaning: 'ConclusÃ£o, realizaÃ§Ã£o, viagem.' }
]

export function getDailyCard(userId: string): TarotCard {
    // Simple deterministic algorithm based on date and userId
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const seedString = `${userId}-${today}`

    // Simple hash function
    let hash = 0
    for (let i = 0; i < seedString.length; i++) {
        const char = seedString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }

    const index = Math.abs(hash) % MAJOR_ARCANA.length
    return MAJOR_ARCANA[index]
}

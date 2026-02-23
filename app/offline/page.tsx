export default function OfflinePage() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f0a1e",
                color: "#e9d5ff",
                fontFamily: "sans-serif",
                textAlign: "center",
                padding: "2rem",
            }}
        >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔮</div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Você está offline
            </h1>
            <p style={{ color: "#a78bfa", maxWidth: "360px" }}>
                Parece que você perdeu a conexão com o universo. Verifique sua internet e tente novamente.
            </p>
            <a
                href="/"
                style={{
                    marginTop: "2rem",
                    padding: "0.75rem 1.5rem",
                    background: "#7c3aed",
                    color: "#fff",
                    borderRadius: "0.5rem",
                    textDecoration: "none",
                    fontWeight: 600,
                }}
            >
                Tentar novamente
            </a>
        </div>
    );
}

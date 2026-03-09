export function WebGLShader() {
    return (
        <div className="absolute inset-0 max-w-full max-h-full overflow-hidden bg-[#000000] -z-10">
            {/* Fallback gradient representing the shader */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,50,0.5),rgba(0,0,0,1))] mix-blend-screen" />
        </div>
    )
}

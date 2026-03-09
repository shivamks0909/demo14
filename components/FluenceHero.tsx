'use client'

import { Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'
import { SplineScene } from '@/components/ui/splite'

export default function FluenceHero() {
    return (
        <section id="home" className="relative pt-32 pb-16 overflow-hidden bg-bg-main">
            <div className="max-w-7xl mx-auto px-6 relative z-10">

                {/* Top badge + headline (centered) */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary-tint border border-primary/10 text-primary font-bold text-[10px] uppercase tracking-widest animate-reveal mb-8">
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        <span>Revolutionizing Data Intelligence</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black text-text-dark leading-[0.95] tracking-tighter mb-6 animate-reveal" style={{ animationDelay: '100ms' }}>
                        OpinionInsights –{' '}
                        <span className="text-text-muted/40">Your Voice.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-text-body leading-relaxed max-w-2xl mx-auto mb-10 animate-reveal" style={{ animationDelay: '200ms' }}>
                        We provide the clarity and strategic insights your business needs to thrive. Confident decision-making starts here.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-reveal" style={{ animationDelay: '300ms' }}>
                        <button className="fluence-btn-primary w-full sm:w-auto">
                            View Our Expertise
                        </button>
                        <button className="fluence-btn-secondary w-full sm:w-auto flex items-center justify-center group">
                            <div className="w-6 h-6 bg-bg-alt rounded-full flex items-center justify-center mr-2 group-hover:bg-primary-tint transition-colors">
                                <Play className="w-3 h-3 text-text-dark fill-text-dark group-hover:text-primary group-hover:fill-primary" />
                            </div>
                            Watch Our Solutions
                        </button>
                    </div>
                </div>

                {/* ─── 3-D Spline Scene Card ─── */}
                <div className="animate-reveal" style={{ animationDelay: '450ms' }}>
                    <Card className="w-full h-[520px] bg-white relative overflow-hidden rounded-[40px] border border-slate-100 shadow-2xl">
                        <Spotlight
                            className="-top-40 left-0 md:left-60 md:-top-20"
                            fill="rgba(91, 92, 246, 0.15)"
                        />

                        <div className="flex h-full">
                            {/* Left text */}
                            <div className="flex-1 p-10 relative z-10 flex flex-col justify-center">
                                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                    Powered by AI
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
                                    Interactive<br />3D Insights
                                </h2>
                                <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                                    Bring your data to life with immersive 3-D visualisations. Capture attention and act with confidence.
                                </p>
                                <div className="mt-8 flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 border-2 border-white" />
                                        ))}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">10,000+ researchers trust us</span>
                                </div>
                            </div>

                            {/* Right Spline robot */}
                            <div className="flex-1 relative">
                                <SplineScene
                                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    )
}

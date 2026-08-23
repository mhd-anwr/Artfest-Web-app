import React from 'react'

export default class HeroErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('HeroErrorBoundary caught an unhandled rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="relative w-full h-screen min-h-[500px] bg-[#02090D] flex flex-col items-center justify-center text-center p-6 text-white select-none">
          <div className="max-w-2xl mx-auto z-10">
            <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-corvion font-bold uppercase tracking-wider text-white leading-none drop-shadow-2xl flex flex-nowrap items-center justify-center gap-x-[0.35em] whitespace-nowrap mb-2">
              <span className="text-white">DECODING</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515]">
                PHYTOLORE
              </span>
            </h1>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}

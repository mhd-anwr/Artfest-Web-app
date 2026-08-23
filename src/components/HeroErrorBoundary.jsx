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
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-brand uppercase tracking-tight text-white mb-2">
              <span className="block text-white">DECODING</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515]">
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

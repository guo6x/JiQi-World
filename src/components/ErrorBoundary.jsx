import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white p-8 text-center">
            <div>
                <h1 className="text-4xl mb-4">⚠️</h1>
                <h2 className="text-xl font-light mb-2">Something went wrong.</h2>
                <p className="text-gray-500 text-sm mb-4">{this.state.error?.toString()}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 border border-white/20 hover:bg-white/10 rounded-full transition-colors"
                >
                    Reload World
                </button>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

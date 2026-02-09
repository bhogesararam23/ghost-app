"use client";

import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-zinc-100 p-4">
                    <div className="max-w-md w-full space-y-4 text-center">
                        <div className="text-6xl">⚠️</div>
                        <h1 className="text-2xl font-bold">Something went wrong</h1>
                        <p className="text-zinc-400">
                            An unexpected error occurred. Please refresh the page to continue.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-md bg-zinc-100 px-6 py-2 text-sm font-medium text-black hover:bg-zinc-200"
                            >
                                Refresh Page
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-400">
                                    Technical details
                                </summary>
                                <pre className="mt-2 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-400 border border-zinc-800">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

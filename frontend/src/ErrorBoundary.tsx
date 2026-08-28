import { Component, type ReactNode } from "react";

interface State { error: Error | null; }

/** Without this, any uncaught render error unmounts the whole React tree and
 * leaves a blank page with no indication anything went wrong -- this catches
 * that and shows a recoverable screen instead. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("DocuVerify UI crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-risk-high font-medium">Something went wrong displaying this page</div>
          <p className="text-white/50 max-w-md text-sm font-mono">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/dashboard"; }}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };

type State = { err: Error | null };

export class FeedErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info);
  }

  render() {
    if (this.state.err) {
      return (
        this.props.fallback ?? (
          <div className="empty" style={{ padding: 48 }}>
            Что-то пошло не так. Обнови страницу.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

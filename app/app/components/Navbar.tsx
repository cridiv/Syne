"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    return (
        <header
            style={{
                position: "sticky",
                top: 0,
                zIndex: 40,
                borderBottom: "1px solid var(--border)",
                background: "var(--bg)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 32px",
                    height: 56,
                    width: "100%",
                }}
            >
                {/* Logo */}
                <Link
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                    }}
                >
                    <span
                        style={{
                            fontSize: 17,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "var(--text)",
                        }}
                    >
                        SYNE
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: "var(--text-3)",
                            fontFamily: "var(--font-mono)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Beta
                    </span>
                </Link>

                {/* Right nav */}
                <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <NavLink href="/dashboard" active={pathname === "/dashboard"}>
                        Dashboard
                    </NavLink>
                    <NavLink
                        href="https://github.com/cridiv/syne"
                        external
                    >
                        GitHub
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}

function NavLink({
    href,
    children,
    active,
    external,
}: {
    href: string;
    children: React.ReactNode;
    active?: boolean;
    external?: boolean;
}) {
    const style: React.CSSProperties = {
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--text)" : "var(--text-2)",
        background: active ? "var(--surface)" : "transparent",
        transition: "color 0.15s, background 0.15s",
        cursor: "pointer",
    };

    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={style}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-2)";
                }}
            >
                {children}
            </a>
        );
    }

    return (
        <Link
            href={href}
            style={style}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "var(--surface)";
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.color = "var(--text-2)";
                    e.currentTarget.style.background = "transparent";
                }
            }}
        >
            {children}
        </Link>
    );
}
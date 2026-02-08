"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const projects = [
  {
    title: "Arc Liquidity Hub + ENS Identity",
    tags: ["Arc Testnet", "ENS", "Sepolia"],
    description: "ERC-4626 SavingsVault on Arc aggregates USDC liquidity while ENS commit-reveal on Sepolia provides trustless user identities.",
    number: "01",
  },
  {
    title: "Automated CCTP Bridge Orchestration",
    tags: ["Circle CCTP", "Cross-Chain", "Relayer"],
    description: "Backend relayer detects vault events and bridges native USDC between Arc and Sepolia using Circle CCTP with full confirmation tracking.",
    number: "02",
  },
  {
    title: "Uniswap v4 Yield Deployment",
    tags: ["Uniswap v4", "Hooks", "DeFi"],
    description: "Bridged USDC is deployed on Sepolia into Uniswap v4 via custom hook–based liquidity execution using the unlock callback pattern.",
    number: "03",
  },
  {
    title: "Privacy-Preserving Compliance Tracking",
    tags: ["Supabase", "Oracle", "ChallengeTracker"],
    description: "App usage stays off-chain in Supabase while only daily compliance proofs are recorded on-chain via ChallengeTracker.",
    number: "04",
  },
  {
    title: "Reverse Bridge & Yield Distribution",
    tags: ["CCTP", "Yield", "Redemption"],
    description: "Yield is withdrawn from Uniswap, bridged back to Arc via CCTP, and distributed to users as principal plus earned returns.",
    number: "05",
  },
]

export function Works() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="relative py-32 px-8 md:px-12 md:py-24">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-24"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-4">04 — TECHNICAL ARCHITECTURE</p>
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">Cross-Chain Infrastructure</h2>
      </motion.div>

      {/* Projects List */}
      <div className="relative space-y-0">
        {projects.map((project, index) => (
          <motion.div
            key={project.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="relative border-t border-white/10 overflow-hidden"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="py-8 md:py-12 cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Number */}
                <span className="font-mono text-xs text-muted-foreground tracking-widest">
                  {project.number}
                </span>

                {/* Title */}
                <div className="flex-1">
                  <motion.h3
                    className="font-sans text-3xl md:text-5xl lg:text-6xl font-light tracking-tight transition-colors duration-300"
                    animate={{
                      color: hoveredIndex === index ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {project.title}
                  </motion.h3>

                  {/* Dropdown Description */}
                  <AnimatePresence>
                    {hoveredIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                          {project.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tags */}
                <div className="flex gap-2 flex-wrap md:min-w-[240px] md:justify-end">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] tracking-wider px-3 py-1 border border-white/20 rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Border */}
      <div className="border-t border-white/10 mt-0" />
    </section>
  )
}

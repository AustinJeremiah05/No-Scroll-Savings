'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEnsRegistration } from '@/hooks/use-ens-registration'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { formatEther } from 'viem'

interface ENSRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ENSRegistrationModal({ isOpen, onClose }: ENSRegistrationModalProps) {
  const [domainInput, setDomainInput] = useState('')
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const {
    isLoading,
    error,
    registeredName,
    registrationHash,
    currentStep,
    commitmentTime,
    getTimeRemaining,
    checkAvailability,
    getPrice,
    submitCommitment,
    registerDomain,
    getEnsExplorerUrl,
    getSepoliaExplorerUrl,
  } = useEnsRegistration()

  // Update time remaining every second
  useEffect(() => {
    if (currentStep === 'waiting') {
      const interval = setInterval(() => {
        setTimeRemaining(getTimeRemaining())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [currentStep, getTimeRemaining])

  const handleCheckAvailability = async () => {
    if (!domainInput.trim()) return

    const available = await checkAvailability(domainInput)
    setIsAvailable(available)

    if (available) {
      const priceData = await getPrice(domainInput)
      setPrice(priceData)
    }
  }

  const handleRegisterClick = async () => {
    if (currentStep === 'idle') {
      // Step 1: Submit commitment
      const success = await submitCommitment(domainInput)
      if (success) {
        setTimeRemaining(60)
      }
    } else if (currentStep === 'waiting' && timeRemaining <= 0) {
      // Step 2: Register domain
      await registerDomain(domainInput)
      // Don't auto-close - let user click Done button to close
    }
  }

  const canRegister = isAvailable && !isLoading && (currentStep === 'idle' || (currentStep === 'waiting' && timeRemaining <= 0))

  // Prevent modal from closing during registration process
  const handleOpenChange = (open: boolean) => {
    // Only allow closing if not in middle of registration
    if (!open && currentStep === 'idle' && !isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => {
        // Prevent closing when clicking outside during registration
        if (currentStep !== 'idle' || isLoading) {
          e.preventDefault()
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Register ENS Name</DialogTitle>
          <DialogDescription>
            {registeredName
              ? 'Your ENS domain has been registered!'
              : 'Register your .eth domain on Sepolia testnet'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Success State */}
          {registeredName ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Success!</h3>
                <p className="text-lg font-mono text-green-600 mb-4">{registeredName}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Your domain is now registered and will be visible across all chains including Arc!
                </p>
              </div>

              {/* Links Section */}
              <div className="w-full space-y-3">
                {/* ENS Explorer Link */}
                <a
                  href={getEnsExplorerUrl(registeredName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition"
                >
                  <div className="text-sm font-medium text-blue-600 mb-1">View on ENS App</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {getEnsExplorerUrl(registeredName)}
                  </div>
                </a>

                {/* Etherscan Link */}
                {registrationHash && (
                  <a
                    href={getSepoliaExplorerUrl(registrationHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition"
                  >
                    <div className="text-sm font-medium text-purple-600 mb-1">View Transaction</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {getSepoliaExplorerUrl(registrationHash)}
                    </div>
                  </a>
                )}
              </div>

              <Button onClick={() => {
                onClose()
                // Reset form state
                setDomainInput('')
                setIsAvailable(null)
                setPrice(null)
              }} className="w-full mt-4">
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 py-4"
            >
              {/* Domain Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain Name</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="sugan"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value)
                      setIsAvailable(null)
                      setPrice(null)
                    }}
                    disabled={isLoading || currentStep !== 'idle'}
                    className="flex-1"
                  />
                  <span className="flex items-center text-muted-foreground">.eth</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              {/* Availability & Price Info */}
              {isAvailable !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-lg border ${
                    isAvailable
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-destructive/10 border-destructive/20'
                  }`}
                >
                  <p className="text-sm font-medium mb-2">
                    {isAvailable ? '✅ Domain is available!' : '❌ Domain is not available'}
                  </p>
                  {isAvailable && price !== null && (
                    <p className="text-sm text-muted-foreground">
                      Price: <span className="font-semibold">{formatEther(price)} ETH</span> per year
                    </p>
                  )}
                </motion.div>
              )}

              {/* Steps Info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Registration Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Check Availability" to verify domain</li>
                  <li>Click "Start Registration" to commit</li>
                  <li>Wait 60 seconds</li>
                  <li>Click "Complete Registration" and pay the fee</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {/* Check Availability Button */}
                {currentStep === 'idle' && isAvailable === null && (
                  <Button
                    onClick={handleCheckAvailability}
                    disabled={!domainInput.trim() || isLoading}
                    className="flex-1"
                    variant="outline"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Check Availability'
                    )}
                  </Button>
                )}

                {/* Check Again Button */}
                {isAvailable !== null && currentStep === 'idle' && (
                  <Button
                    onClick={() => {
                      setIsAvailable(null)
                      setPrice(null)
                    }}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    Check Different Domain
                  </Button>
                )}

                {/* Register Buttons */}
                {isAvailable && (
                  <>
                    {currentStep === 'waiting' && timeRemaining > 0 && (
                      <Button disabled className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        Wait {timeRemaining}s
                      </Button>
                    )}

                    {(currentStep === 'idle' || (currentStep === 'waiting' && timeRemaining <= 0)) && (
                      <Button
                        onClick={handleRegisterClick}
                        disabled={!canRegister}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {currentStep === 'idle' ? 'Starting...' : 'Registering...'}
                          </>
                        ) : currentStep === 'idle' ? (
                          'Start Registration'
                        ) : (
                          'Complete Registration'
                        )}
                      </Button>
                    )}

                    {currentStep === 'registering' && (
                      <Button disabled className="flex-1">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 Your domain will be registered on <strong>Sepolia testnet</strong> but will be visible
                  when you connect to <strong>Arc testnet</strong>!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

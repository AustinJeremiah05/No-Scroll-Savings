"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAccount } from "wagmi";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_KEY || ""
);

export function useComplianceTimer(lockDurationMinutes: number = 5) {
  const { address } = useAccount();
  const [timeRemaining, setTimeRemaining] = useState(lockDurationMinutes * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Start timer
  const startTimer = () => {
    setStartTime(new Date());
    setTimeRemaining(lockDurationMinutes * 60);
    setIsActive(true);
    setIsCompliant(null);
  };

  // Check compliance
  const checkCompliance = async () => {
    if (!address || !startTime) return false;

    try {
      const { data, error } = await supabase
        .from("usage_records")
        .select("*")
        .eq("user_id", address.toLowerCase())
        .gte("created_at", startTime.toISOString())
        .lte("created_at", new Date().toISOString());

      if (error) {
        console.error("Supabase error:", error);
        return true; // Default to compliant on error
      }

      if (!data || data.length === 0) {
        return true; // No usage = compliant
      }

      // Check for Instagram or Snapchat
      const socialMediaApps = ["com.instagram.android", "com.snapchat.android", "instagram", "snapchat"];
      const hasSocialMedia = data.some((record: any) =>
        socialMediaApps.some(
          (app) =>
            record.package_name?.toLowerCase().includes(app) ||
            record.app_name?.toLowerCase().includes(app)
        )
      );

      return !hasSocialMedia;
    } catch (error) {
      console.error("Compliance check error:", error);
      return true;
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          // Check compliance when timer ends
          checkCompliance().then((compliant) => {
            setIsCompliant(compliant);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    timeRemaining,
    formatTime: formatTime(timeRemaining),
    isActive,
    isCompliant,
    startTimer,
    checkCompliance,
  };
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'

export interface UseCollectionResult<T> {
  data: T[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches a Supabase table with optional filtering and optional realtime updates.
 *
 * PERFORMANCE NOTES:
 * - Pass `realtime: false` for read-only data that doesn't need live updates.
 *   This avoids opening a WebSocket channel just to watch static data.
 * - Wrap your `queryFn` in `useCallback` in the caller to prevent infinite
 *   re-fetch loops. If you don't, this hook will re-run on every render.
 * - The channel name is deterministic (based on table + options), so React
 *   Strict Mode double-effects won't create duplicate WebSocket connections.
 */
export function useSupabaseCollection<T = any>(
  table: string,
  queryFn?: (query: any) => any,
  options?: { realtime?: boolean }
): UseCollectionResult<T> {
  const { supabase } = useSupabase()
  const [data, setData] = useState<T[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const enableRealtime = options?.realtime !== false // default: true

  // Generate a unique channel ID once per hook instance (using useRef so it
  // doesn't change on re-renders). This prevents two component instances that
  // watch the same table from colliding on the same Supabase channel.
  const channelIdRef = useRef(`collection:${table}:${Math.random().toString(36).substring(7)}`)

  // Stable refetch trigger
  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      let baseQuery = supabase.from(table).select('*')
      if (queryFn) {
        baseQuery = queryFn(baseQuery)
      }

      const { data: result, error: fetchError } = await baseQuery
      if (cancelled) return

      if (fetchError) {
        setError(fetchError as unknown as Error)
      } else {
        setData(result as T[])
      }
      setIsLoading(false)
    }

    fetchData()

    if (!enableRealtime) {
      return () => { cancelled = true }
    }

    // channelIdRef is stable per hook instance (set once via useRef).
    // This prevents channel name collisions between different component instances
    // that happen to watch the same table.
    const channelId = channelIdRef.current
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => (prev ? [...prev, payload.new as T] : [payload.new as T]))
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) => {
              if (!prev) return prev
              const idx = prev.findIndex((item: any) => item.id === payload.new.id)
              if (idx === -1) return prev
              const next = [...prev]
              next[idx] = { ...next[idx], ...payload.new }
              return next
            })
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => (prev ? prev.filter((item: any) => item.id !== payload.old.id) : prev))
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, supabase, enableRealtime, tick])
  // NOTE: queryFn intentionally omitted from deps — callers MUST wrap it in
  // useCallback. Adding it here causes infinite loops when callers pass inline fns.

  return { data, isLoading, error, refetch }
}

export function useSupabaseDoc<T = any>(
  table: string,
  id: string | null | undefined
): UseCollectionResult<T> {
  const { supabase } = useSupabase()
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(!!id)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  // Per-instance channel ID — stable across re-renders, unique per component mount
  const channelIdRef = useRef(`doc:${table}:${id ?? 'null'}:${Math.random().toString(36).substring(7)}`)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!id) {
      setData(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      const { data: result, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (fetchError) {
        setError(fetchError as unknown as Error)
      } else {
        setData(result as T)
      }
      setIsLoading(false)
    }

    fetchData()

    // Per-instance channel ID (from useRef) — avoids collisions when multiple
    // components watch the same doc simultaneously
    const channelId = channelIdRef.current
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
        () => { fetchData() }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, id, supabase, tick])

  return { data: data as any, isLoading, error, refetch }
}

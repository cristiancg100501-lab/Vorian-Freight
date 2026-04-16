'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'

export interface UseCollectionResult<T> {
  data: T[] | null
  isLoading: boolean
  error: Error | null
}

export function useSupabaseCollection<T = any>(
  table: string,
  queryFn?: (query: any) => any
): UseCollectionResult<T> {
  const { supabase } = useSupabase()
  const [data, setData] = useState<T[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let baseQuery = supabase.from(table).select('*')
    if (queryFn) {
      baseQuery = queryFn(baseQuery)
    }

    const fetchData = async () => {
      setIsLoading(true)
      const { data, error } = await baseQuery
      if (error) {
        setError(error)
      } else {
        setData(data as T[])
      }
      setIsLoading(false)
    }

    fetchData()

    // Real-time subscription
    const channelId = `${table}_realtime_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => prev ? [...prev, payload.new as T] : [payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) => {
              if (!prev) return prev;
              const index = prev.findIndex((item: any) => item.id === payload.new.id);
              if (index === -1) return prev;
              
              const newData = [...prev];
              newData[index] = { ...newData[index], ...payload.new };
              return newData;
            });
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => {
              if (!prev) return prev;
              return prev.filter((item: any) => item.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, supabase, queryFn])

  return { data, isLoading, error }
}

export function useSupabaseDoc<T = any>(
  table: string,
  id: string | null | undefined
): UseCollectionResult<T> {
  const { supabase } = useSupabase()
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(!!id)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setData(null)
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error)
      } else {
        setData(data as T)
      }
      setIsLoading(false)
    }

    fetchData()

    const channelId = `${table}_${id}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table, filter: `id=eq.${id}` },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, id, supabase])

  return { data: data as any, isLoading, error }
}

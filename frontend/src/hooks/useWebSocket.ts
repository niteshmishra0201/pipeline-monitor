import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  event: string
  data: Record<string, unknown>
}

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  reconnectCount: number
}

export function useWebSocket(
  onMessage?: (message: WebSocketMessage) => void
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setReconnectCount(0)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        setLastMessage(message)
        if (message.event !== 'pong') {
          onMessageRef.current?.(message)
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectCount(prev => prev + 1)
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  return { isConnected, lastMessage, reconnectCount }
}
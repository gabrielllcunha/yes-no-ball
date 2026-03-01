import { useEffect, useRef } from 'react'
import { createYesNoBall } from '../ball-engine'

export function YesNoBall() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const destroy = createYesNoBall(container)
    return destroy
  }, [])

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  )
}

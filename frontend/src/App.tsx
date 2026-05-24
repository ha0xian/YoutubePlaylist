import { useEffect, useState } from 'react'

interface ApiResponse {
  message: string
  status: string
}

function App() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>
  }

  if (!data) {
    return <p>Loading...</p>
  }

  return (
    <div>
      <h1>{data.message}</h1>
      <p>Status: {data.status}</p>
    </div>
  )
}

export default App

'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export function PodcastApp() {
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [error, setError] = useState('')

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setAudioUrl(data.audio_url)
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Podcast Generator</h1>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter topic"
            value={topic}
            onChange={handleTopicChange}
            className="w-full bg-gray-700 text-white border-gray-600"
          />
          <Button
            onClick={handleSubmit}
            disabled={!topic || isLoading}
            className="w-full bg-gray-600 text-white hover:bg-gray-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Podcast...
              </>
            ) : (
              'Generate Podcast'
            )}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {audioUrl && (
            <div className="mt-4">
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

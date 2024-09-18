'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Play, Pause, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

interface Podcast {
  id: number;
  topic: string;
  audio_url: string;
}

interface AudioPlayerProps {
  audioUrl: string;
}

function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      const updateTime = () => setCurrentTime(audio.currentTime)
      const updateDuration = () => setDuration(audio.duration)

      audio.addEventListener('timeupdate', updateTime)
      audio.addEventListener('loadedmetadata', updateDuration)
      return () => {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('loadedmetadata', updateDuration)
      }
    }
  }, [audioUrl])

  useEffect(() => {
    const generateWaveform = async () => {
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const channelData = audioBuffer.getChannelData(0)
      const samples = 100
      const blockSize = Math.floor(channelData.length / samples)
      const filteredData = []
      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j])
        }
        filteredData.push(sum / blockSize)
      }
      setWaveformData(filteredData)
    }

    generateWaveform()
  }, [audioUrl])

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx && waveformData.length > 0) {
        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.offsetWidth * dpr
        canvas.height = 200 * dpr
        ctx.scale(dpr, dpr)

        const width = canvas.width / dpr
        const height = 200
        const barWidth = width / waveformData.length


        ctx.fillStyle = '#4a5568' // Background color
        // ctx.fillRect(0, 0, width, height)

        // Find the maximum value in the waveform data
        const maxValue = Math.max(...waveformData)

        // Calculate the center line
        const centerY = height / 2

        // Calculate the prgoress of the audio
        const progress = currentTime / duration

        // Scale and draw the waveform data
        waveformData.forEach((value, index) => {
        const scaledValue = (value / maxValue) * (height / 2)
        ctx.fillStyle = index / waveformData.length <= progress ? '#e2e8f0' : '#718096' // Change color based on progress
        ctx.fillRect(index * barWidth, centerY - scaledValue, barWidth, scaledValue * 2)
        })
      }
    }

    drawWaveform()
  }, [waveformData, currentTime, duration])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (audio) {
      if (audio.paused) {
        audio.play()
        setIsPlaying(true)
      } else {
        audio.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (canvas && audio) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const clickPosition = x / canvas.offsetWidth
      audio.currentTime = clickPosition * audio.duration
    }
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayPause}
        className="text-white hover:text-gray-300"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-grow">
        <canvas
          ref={canvasRef}
          className="w-full h-8 cursor-pointer"
          onClick={handleWaveformClick}
        />
      </div>
      <span className="text-xs whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
      <audio ref={audioRef} src={audioUrl} />
    </div>
  )
}

export function PodcastApp() {
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentPodcasts, setRecentPodcasts] = useState<Podcast[]>([])

  useEffect(() => {
    fetchPodcasts()
  }, [])

  const fetchPodcasts = async () => {
    try {
      const response = await fetch('/api/podcasts/')
      if (!response.ok) {
        throw new Error('Failed to fetch podcasts')
      }
      const data = await response.json()
      setRecentPodcasts(data.slice(0, 5)) // Limit to 5 most recent podcasts
    } catch (error) {
      console.error('Error fetching podcasts:', error)
      setError('Failed to load podcasts')
    }
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/podcasts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      })
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`)
      }
      await fetchPodcasts() // Refresh the podcast list
      setTopic('') // Clear the input field
    } catch (error: unknown) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/podcasts/${id}/`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete podcast')
      }
      await fetchPodcasts() // Refresh the podcast list
    } catch (error) {
      console.error('Error deleting podcast:', error)
      setError('Failed to delete podcast')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
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

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Podcasts</h2>
            <div className="space-y-4">
              {recentPodcasts.map((podcast) => (
                <Card key={podcast.id} className="bg-gray-700 text-white">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm">{podcast.topic}</h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Confirm Deletion</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this podcast? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => {}}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleDelete(podcast.id)}>Delete</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <AudioPlayer audioUrl={podcast.audio_url} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

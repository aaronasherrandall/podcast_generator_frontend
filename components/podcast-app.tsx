'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Play, Pause, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

/**
 * Declares a global interface for the `window` object.
 * This interface extends the `Window` interface and adds a property `webkitAudioContext` of type `AudioContext`.
 *
 * @global
 * @interface Window
 * @extends globalThis.Window
 */
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

/**
 * Represents a podcast.
 *
 * @remarks
 * This interface defines the structure of a podcast object.
 *
 * @public
 */
interface Podcast {
  id: number;
  topic: string;
  audio_url: string;
}

interface AudioPlayerProps {
  audioUrl: string;
}

/**
 * AudioPlayer component for playing audio and displaying a waveform.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {string} props.audioUrl - The URL of the audio file to be played.
 * @returns {JSX.Element} The rendered AudioPlayer component.
 */
function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  // * Represents the state of whether the podcast is currently playing or not.
  // * The audio is paused by default.
  // * The state is toggled when the play/pause button is clicked.
  // * The state is used to determine the icon of the play/pause button.
  // * The state is also used to determine whether the audio should be played or paused.
  // * The state is updated when the audio is played or paused.
  const [isPlaying, setIsPlaying] = useState(false)
  // * Represents the current time of the audio playback.
  const [currentTime, setCurrentTime] = useState(0)
  // * Represents the total duration of the audio file.
  // * The duration is set to 0 initially and is updated when the audio file is loaded.
  const [duration, setDuration] = useState(0)
  // * Ref object for the audio element.
  const audioRef = useRef<HTMLAudioElement>(null)
  // * Ref object for the canvas element.
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // * Represents the waveform data of the audio file.
  const [waveformData, setWaveformData] = useState<number[]>([])

  // * Effect hook that runs when the audio URL changes.
  // * The effect adds event listeners to the audio element to update the current time and duration.
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

  // * Effect hook that runs when the audio URL changes.
  // * The effect fetches the audio file and decodes it to generate the waveform data.
  // * The effect updates the waveform data state with the generated waveform data.
  // * The effect runs only when the audio URL changes.
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

  // * Effect hook that runs when the waveform data, current time, or duration changes.
  // * The effect draws the waveform on the canvas element.
  // * The effect scales and draws the waveform data based on the current time and duration.
  // * The effect runs when the waveform data, current time, or duration changes.
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

  // * Function to toggle play/pause of the audio.
  // * The function plays the audio if it is paused.
  // * The function pauses the audio if it is playing.
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

  // * Function to handle click events on the waveform.
  // * The function calculates the click position and sets the audio current time accordingly.
  // * The function is called when the waveform is clicked.
  // * The function updates the audio current time based on the click position.
  // * The function is used to seek the audio to a specific position.
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

  // * Function to format the time in minutes and seconds.
  // * The function takes a time in seconds and returns a formatted string in the format `mm:ss`.
  // * The function is used to display the current time and duration of the audio.
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // * Render the AudioPlayer component.
  // * The component consists of a play/pause button, a waveform canvas, and a time display.
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

// * PodcastApp component for generating and playing podcasts.
// * The component allows users to generate podcasts based on a topic.
// * The component displays loading and error messages.
export function PodcastApp() {
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentPodcasts, setRecentPodcasts] = useState<Podcast[]>([])

  // * Effect hook that runs when the component is mounted.
  // * The effect fetches the most recent podcasts from the server.
  // * The effect updates the recent podcasts state with the fetched data.
  useEffect(() => {
    fetchPodcasts()
  }, [])

  // * Function to fetch the most recent podcasts from the server.
  // * The function makes a GET request to the `/api/podcasts/` endpoint.
  // * The function updates the recent podcasts state with the fetched data.
  const fetchPodcasts = async () => {
    try {
      const response = await fetch('/api/podcasts/')
      if (!response.ok) {
        throw new Error('Failed to fetch podcasts')
      }
      // * Parse the response data as JSON
      // * Limit the number of podcasts to 5
      const data = await response.json()
      setRecentPodcasts(data.slice(0, 5)) // Limit to 5 most recent podcasts
    } catch (error) {
      console.error('Error fetching podcasts:', error)
      setError('Failed to load podcasts')
    }
  }

  // * Function to handle changes to the topic input field.
  // * The function updates the topic state with the value of the input field.
  // * The function is called when the input field value changes.
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  // * Function to handle form submission.
  // * The function generates a podcast based on the topic input.
  // * The function makes a POST request to the `/api/podcasts/` endpoint.
  // * The function updates the recent podcasts state with the generated podcast.
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

  // * Function to handle deletion of a podcast.
  // * The function makes a DELETE request to the `/api/podcasts/:id/` endpoint.
  // * The function updates the recent podcasts state by fetching the most recent podcasts.
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/podcasts/${id}/`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete podcast: ${response.status} ${errorText}`);
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

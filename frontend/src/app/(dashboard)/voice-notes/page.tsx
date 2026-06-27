"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle, Mic, Clock, FileAudio, Search, User } from "lucide-react";

interface VoiceNote {
  id: string;
  transcript: string;
  durationSecs: number | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  message: {
    conversation: {
      customer: {
        name: string;
        phone: string;
      };
    };
  };
}

export default function VoiceNotesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function loadData() {
    try {
      setError(null);
      const res = await fetch(`${apiUrl}/api/v1/voice-notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load voice notes log");
      const list = await res.json();
      setVoiceNotes(list);
    } catch (err: any) {
      console.error(err);
      setError("Error loading voice notes. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb * 10) / 10} KB`;
    return `${Math.round(kb / 1024 * 10) / 10} MB`;
  };

  const filteredVoiceNotes = voiceNotes.filter(note => {
    const customer = note.message?.conversation?.customer;
    return (
      customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.transcript.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading voice notes panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voice Note Bookings</h2>
          <p className="text-muted-foreground">Monitor inbound customer audio files, Whisper speech-to-text transcriptions, and parsed booking slots.</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Sync recordings
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Voice Notes Log Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-green-600" />
            <span>Transcription & Media Feed</span>
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client or transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredVoiceNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Mic className="h-10 w-10 text-gray-300 mb-2 animate-bounce" />
              <p className="text-sm font-medium">No voice notes recorded yet</p>
              <p className="text-xs mt-1">When clients send audio messages via WhatsApp, transcription results will populate here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVoiceNotes.map((note) => {
                const customer = note.message?.conversation?.customer || { name: "Unknown Customer", phone: "" };
                return (
                  <div
                    key={note.id}
                    className="border rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm flex flex-col md:flex-row justify-between items-start md:items-stretch gap-4"
                  >
                    {/* Media metadata and client */}
                    <div className="flex flex-col justify-between space-y-2 md:w-1/3 shrink-0">
                      <div>
                        <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                          <User className="h-4 w-4 text-gray-400" /> {customer.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{customer.phone}</div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Received: {new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileAudio className="h-3.5 w-3.5" />
                          <span>
                            {note.durationSecs ? `${note.durationSecs}s` : "Unknown duration"} • {note.mimeType || "audio/ogg"} ({formatFileSize(note.fileSize)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transcription outcome */}
                    <div className="flex-1 bg-white border rounded-lg p-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-green-600 tracking-wider">AI Transcript (Whisper)</span>
                        <p className="text-xs text-gray-700 font-mono leading-relaxed italic">
                          "{note.transcript}"
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-end">
                        <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Successfully Processed
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

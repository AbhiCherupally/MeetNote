'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { meetNoteAPI } from '@/lib/api';

export default function APIDemo() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Initialize API and check connection
    meetNoteAPI.init();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const health = await meetNoteAPI.healthCheck();
      setIsConnected(true);
      setMessage(`✅ Backend Connected! Status: ${health.status}`);
    } catch (error) {
      setIsConnected(false);
      setMessage(`❌ Backend Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setMessage('❌ Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const result = await meetNoteAPI.register(email, password, name);
      setMessage(`✅ Registration successful! Welcome ${result.user.name}`);
    } catch (error) {
      setMessage(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('❌ Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const result = await meetNoteAPI.login(email, password);
      setMessage(`✅ Login successful! Welcome ${result.user.name}`);
    } catch (error) {
      setMessage(`❌ Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testMeeting = async () => {
    try {
      setLoading(true);
      const meeting = await meetNoteAPI.createMeeting({
        title: 'Test Meeting',
        platform: 'zoom',
        meetingUrl: 'https://zoom.us/test'
      });
      setMessage(`✅ Meeting created! ID: ${meeting.meeting.id}`);
    } catch (error) {
      setMessage(`❌ Meeting creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 MeetNote API Demo
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkHealth} disabled={loading} className="w-full">
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </Button>
          
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRegister} disabled={loading} className="flex-1">
              Register
            </Button>
            <Button onClick={handleLogin} disabled={loading} className="flex-1" variant="outline">
              Login
            </Button>
          </div>

          <Button onClick={testMeeting} disabled={loading} className="w-full" variant="secondary">
            Test Create Meeting
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎯 Backend Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p><strong>Backend URL:</strong> https://meetnote.onrender.com</p>
            <p><strong>Health Check:</strong> /health</p>
            <p><strong>Status:</strong> {isConnected ? '🟢 Online' : '🔴 Offline'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
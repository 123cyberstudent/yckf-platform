import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface RecordingStatus {
  isRecording: boolean;
  duration: number; // in milliseconds
  uri?: string;
}

class AudioRecordingService {
  private static instance: AudioRecordingService;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  public static getInstance(): AudioRecordingService {
    if (!AudioRecordingService.instance) {
      AudioRecordingService.instance = new AudioRecordingService();
    }
    return AudioRecordingService.instance;
  }

  /**
   * Request audio recording permission
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request audio permission:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<{ success: boolean; error?: string }> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Microphone permission denied',
        };
      }

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;

      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return {
        success: false,
        error: 'Failed to start recording. Please try again.',
      };
    }
  }

  /**
   * Stop recording and return the audio file URI
   */
  async stopRecording(): Promise<{ success: boolean; uri?: string; duration?: number; error?: string }> {
    try {
      if (!this.recording) {
        return {
          success: false,
          error: 'No active recording',
        };
      }

      // Get recording status before stopping
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;

      // Stop recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Clear recording reference
      this.recording = null;

      if (!uri) {
        return {
          success: false,
          error: 'Failed to get recording URI',
        };
      }

      return {
        success: true,
        uri,
        duration,
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      return {
        success: false,
        error: 'Failed to stop recording',
      };
    }
  }

  /**
   * Get current recording status
   */
  async getRecordingStatus(): Promise<RecordingStatus | null> {
    try {
      if (!this.recording) {
        return null;
      }

      const status = await this.recording.getStatusAsync();
      
      return {
        isRecording: status.isRecording || false,
        duration: status.durationMillis || 0,
      };
    } catch (error) {
      console.error('Failed to get recording status:', error);
      return null;
    }
  }

  /**
   * Play recorded audio
   */
  async playAudio(uri: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Stop any existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Load and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.stopPlayback();
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to play audio:', error);
      return {
        success: false,
        error: 'Failed to play audio',
      };
    }
  }

  /**
   * Stop audio playback
   */
  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  /**
   * Get audio file info
   */
  async getAudioInfo(uri: string): Promise<{
    size: number;
    duration: number;
  } | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        return null;
      }

      // Load sound to get duration
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      const duration = status.isLoaded ? status.durationMillis || 0 : 0;
      await sound.unloadAsync();

      return {
        size: fileInfo.size || 0,
        duration,
      };
    } catch (error) {
      console.error('Failed to get audio info:', error);
      return null;
    }
  }

  /**
   * Format duration in mm:ss format
   */
  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Delete audio file
   */
  async deleteAudio(uri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('Failed to delete audio:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Failed to cleanup audio resources:', error);
    }
  }
}

export default AudioRecordingService.getInstance();
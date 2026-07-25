import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundaryState, AppError } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../../utils/constants';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, resetError: () => void) => ReactNode;
}

class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger error UI
    return {
      hasError: true,
      error: {
        code: 'BOUNDARY_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, it  would send this to the error reporting service
    // Example: reportError(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              {/* Error Icon */}
              <View style={styles.iconContainer}>
                <Ionicons
                  name="warning-outline"
                  size={64}
                  color={COLORS.error}
                />
              </View>

              {/* Error Message */}
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We encountered an unexpected error. Don't worry, this has been logged
                and our team will look into it.
              </Text>

              {/* Error Details (Development only) */}
              {__DEV__ && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Error Details (Debug):</Text>
                  <View style={styles.errorDetails}>
                    <Text style={styles.errorCode}>
                      Code: {this.state.error.code}
                    </Text>
                    <Text style={styles.errorMessage}>
                      Message: {this.state.error.message}
                    </Text>
                    {this.state.error.timestamp && (
                      <Text style={styles.errorTime}>
                        Time: {new Date(this.state.error.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.resetError}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={COLORS.text.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    // In a real app, it  might navigate to a support screen
                    // or open email client
                    console.log('Report error pressed');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.secondaryButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon
  iconContainer: {
    marginBottom: SPACING.xl,
  },

  // Text
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeights.relaxed * TYPOGRAPHY.fontSizes.md,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  // Error Details (Debug)
  detailsContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  errorDetails: {
    backgroundColor: COLORS.divider,
    borderRadius: LAYOUT.borderRadius.sm,
    padding: SPACING.md,
  },
  errorCode: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontFamily: 'monospace',
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontFamily: 'monospace',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  errorTime: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontFamily: 'monospace',
    color: COLORS.text.light,
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: LAYOUT.borderRadius.md,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    ...LAYOUT.shadows.medium,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.text.white,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.primary,
  },
});

export default ErrorBoundary;

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  BarChart3,
  Clock,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface CreateVoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateVote: (data: {
    question: string;
    options: string[];
    settings: { allow_multiple: boolean; anonymous: boolean };
    expires_at?: string;
  }) => Promise<void>;
}

const EXPIRY_OPTIONS = [
  { value: 'none', label: 'No limit' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '2 days' },
  { value: '168h', label: '1 week' },
];

export function CreateVoteModal({
  open,
  onOpenChange,
  onCreateVote,
}: CreateVoteModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [expiryOption, setExpiryOption] = useState('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ question?: string; options?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setAnonymous(false);
    setExpiryOption('24h');
    setErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateForm = (): boolean => {
    const newErrors: { question?: string; options?: string } = {};

    if (!question.trim()) {
      newErrors.question = 'Please enter a question';
    }

    const filledOptions = options.filter((opt) => opt.trim());
    if (filledOptions.length < 2) {
      newErrors.options = 'At least 2 options required';
    }

    const uniqueOptions = new Set(filledOptions.map((opt) => opt.toLowerCase().trim()));
    if (uniqueOptions.size !== filledOptions.length) {
      newErrors.options = 'Options must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateExpiryDate = (): string | undefined => {
    if (expiryOption === 'none') return undefined;

    const hours = parseInt(expiryOption.replace('h', ''));
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate.toISOString();
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);
    try {
      const filledOptions = options.filter((opt) => opt.trim());
      await onCreateVote({
        question: question.trim(),
        options: filledOptions,
        settings: {
          allow_multiple: allowMultiple,
          anonymous: anonymous,
        },
        expires_at: calculateExpiryDate(),
      });
      handleClose();
    } catch (error: any) {
      console.error('Failed to create vote:', error);
      // Log full error details for debugging
      console.error('Full vote error details:', {
        message: error?.message,
        name: error?.name,
        response: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          dataType: typeof error.response.data,
          dataStringified: JSON.stringify(error.response.data),
          headers: error.response.headers
        } : 'No response object',
        request: error?.request ? 'Request object exists' : 'No request object',
        config: error?.config ? {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL
        } : 'No config'
      });
      
      // Extract error message from API response - handle multiple formats
      let errorMessage = 'Failed to create vote. Please try again.';
      
      // Check if we have response data
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Log what we actually received
        console.log('Error data received:', {
          errorData,
          isObject: typeof errorData === 'object',
          isArray: Array.isArray(errorData),
          keys: typeof errorData === 'object' ? Object.keys(errorData) : [],
          stringified: JSON.stringify(errorData)
        });
        
        // Handle validation errors with details array
        if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
          const firstError = errorData.details[0];
          errorMessage = firstError.message || errorData.error || errorMessage;
        } 
        // Handle simple error string
        else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        }
        // Handle errors array format (express-validator format)
        else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const firstError = errorData.errors[0];
          errorMessage = firstError.msg || firstError.message || errorMessage;
        }
        // If data is an object but empty or has unexpected structure
        else if (typeof errorData === 'object' && errorData !== null && Object.keys(errorData).length === 0) {
          // Try to get error from status text or status code
          if (error.response.statusText) {
            errorMessage = `Error: ${error.response.statusText} (Status: ${error.response.status})`;
          } else {
            errorMessage = `Server returned empty error (Status: ${error.response.status}). Please check server logs.`;
          }
        }
      } 
      // Fallback to error message if no response data
      else if (error?.message) {
        errorMessage = error.message;
      }
      // Network error
      else if (error?.request && !error?.response) {
        errorMessage = 'Network error: Could not reach server. Please check your connection.';
      }
      // Status code based error (when response exists but no data)
      else if (error?.response?.status) {
        const statusMessages: Record<number, string> = {
          400: 'Invalid request. Please check your input.',
          401: 'Unauthorized. Please log in again.',
          403: 'You do not have permission to perform this action.',
          404: 'Resource not found.',
          500: 'Server error. Please try again later.'
        };
        errorMessage = statusMessages[error.response.status] || `Request failed with status ${error.response.status}.`;
      }
      
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-[#615EF0]/5 to-[#615EF0]/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#615EF0]/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#615EF0]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Create Poll</DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">Create a poll for the group</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Question Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Question <span className="text-red-500">*</span>
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter poll question..."
              className={cn(
                'focus-visible:ring-[#615EF0]',
                errors.question && 'border-red-500 focus-visible:ring-red-500'
              )}
              maxLength={200}
            />
            {errors.question && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.question}
              </p>
            )}
            <p className="text-xs text-gray-400 text-right">{question.length}/200</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Options <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-500">
                    {index + 1}
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 focus-visible:ring-[#615EF0]"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            {errors.options && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.options}
              </p>
            )}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full mt-2 border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
            <p className="text-xs text-gray-400">{options.length}/10 options</p>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700">Settings</p>

            {/* Allow Multiple */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Allow Multiple</p>
                  <p className="text-xs text-gray-500">Users can select multiple options</p>
                </div>
              </div>
              <Switch
                checked={allowMultiple}
                onCheckedChange={setAllowMultiple}
              />
            </div>

            {/* Anonymous */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  {anonymous ? (
                    <EyeOff className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Anonymous Voting</p>
                  <p className="text-xs text-gray-500">Hide voter identity</p>
                </div>
              </div>
              <Switch checked={anonymous} onCheckedChange={setAnonymous} />
            </div>

            {/* Expiry */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-xs text-gray-500">Auto-close after</p>
                </div>
              </div>
              <Select value={expiryOption} onValueChange={setExpiryOption}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* API Error Display */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="bg-[#615EF0] hover:bg-[#5048D9]"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Creating...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Create Poll
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

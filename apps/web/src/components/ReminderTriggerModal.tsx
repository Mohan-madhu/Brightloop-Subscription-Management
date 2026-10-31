'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  PhoneCall,
  Mail,
  MessageSquare,
  Volume2,
  VolumeX,
  ShieldAlert,
  CheckCircle,
  Clock,
  Sparkles,
  Play,
  Send,
  ExternalLink
} from 'lucide-react';

interface ReminderTriggerModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export default function ReminderTriggerModal({
  invoice,
  isOpen,
  onClose,
  onSuccess
}: ReminderTriggerModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['IVR', 'WHATSAPP', 'EMAIL', 'SMS']);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'DISPATCH'>('PREVIEW');
  const [previewSubTab, setPreviewSubTab] = useState<'IVR' | 'WHATSAPP' | 'SMS' | 'EMAIL'>('IVR');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    if (invoice) {
      setPhone(invoice.customer?.phone || '+91 9876543210');
      setEmail(invoice.customer?.email || '');
      setDispatchResult(null);
      setError(null);
      setActiveTab('PREVIEW');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const ivrScript = `Hello ${invoice.customer?.name || 'Customer'}. This is an automated interactive voice notification from Brightloop Software. ` +
    `Your invoice ${invoice.invoiceNumber} for Indian Rupees ${invoice.outstandingAmount?.toLocaleString()} is currently pending payment. ` +
    `The scheduled due date is ${dueDateFormatted}. ` +
    `Please press 1 to receive an instant online payment checkout link via SMS. ` +
    `Press 2 to speak with our accounts and finance desk. ` +
    `Or press 9 to repeat this voice message. ` +
    `Thank you for being a valued Brightloop partner.`;

  const smsText = `Brightloop Alert: Dear ${invoice.customer?.name || 'Customer'}, invoice ${invoice.invoiceNumber} for ₹${invoice.outstandingAmount?.toLocaleString()} is pending payment (Due: ${dueDateFormatted}). Pay securely online at: http://localhost:3000/customer/invoices to avoid subscription interruption. Support: support@brightloop.local`;

  const emailSubject = `Urgent Payment Reminder: Invoice ${invoice.invoiceNumber} (₹${invoice.outstandingAmount?.toLocaleString()})`;

  const cleanPhone = (phone || '+919876543210').replace(/[^0-9]/g, '');
  const whatsappText = `🔔 *Brightloop Payment Notice*\n\n` +
    `Dear *${invoice.customer?.name || 'Customer'}*,\n\n` +
    `This is a friendly reminder that your Brightloop subscription invoice *${invoice.invoiceNumber}* has an outstanding balance of *₹${invoice.outstandingAmount?.toLocaleString()}*.\n\n` +
    `📅 *Due Date:* ${dueDateFormatted}\n` +
    `💳 *Outstanding Balance:* ₹${invoice.outstandingAmount?.toLocaleString()}\n` +
    `📊 *Total Amount:* ₹${invoice.totalAmount?.toLocaleString()}\n\n` +
    `⚡ *Pay Instantly Online via Razorpay:*\nhttp://localhost:3000/customer/invoices\n\n` +
    `_Thank you for choosing Brightloop Software! For support, reply to this message._`;

  const whatsappDirectUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappText)}`;

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSpeakIvr = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech audio preview is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(ivrScript);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleExecuteTrigger = async () => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one notification channel (IVR, WhatsApp, Email, or SMS).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.reminders.trigger({
        invoiceId: invoice.id,
        channels: selectedChannels,
        phone,
        email
      });

      setDispatchResult(res);
      setActiveTab('DISPATCH');
      if (onSuccess) onSuccess(res);

      // If IVR was triggered and user wants audio feedback, play the IVR voice prompt
      if (selectedChannels.includes('IVR') && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        handleSpeakIvr();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    handleStopSpeech();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Multi-Channel Outbound Engine</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Trigger Realtime Reminders (IVR + WhatsApp + Email + SMS)</h2>
              <p className="text-xs text-slate-300">
                Dispatch automated phone voice calls, realtime WhatsApp messages, transactional SMS, and emails for Invoice{' '}
                <span className="font-mono text-emerald-300 font-semibold">{invoice.invoiceNumber}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Details & Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Customer Mobile / WhatsApp Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[10px] text-slate-400">Target for Outbound IVR call, WhatsApp alert & SMS</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Customer Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.com"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400">Target for realtime SMTP email reminder</p>
            </div>
          </div>

          {/* Channel Selector Checkboxes */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Active Trigger Channels
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* IVR Card */}
              <div
                onClick={() => toggleChannel('IVR')}
                className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center space-x-2.5 ${
                  selectedChannels.includes('IVR')
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                    selectedChannels.includes('IVR')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">IVR Call</h4>
                  <p className="text-[10px] text-slate-500">Voice Dial</p>
                </div>
              </div>

              {/* WhatsApp Card */}
              <div
                onClick={() => toggleChannel('WHATSAPP')}
                className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center space-x-2.5 ${
                  selectedChannels.includes('WHATSAPP')
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                    selectedChannels.includes('WHATSAPP')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">WhatsApp</h4>
                  <p className="text-[10px] text-slate-500">Instant Chat</p>
                </div>
              </div>

              {/* SMS Card */}
              <div
                onClick={() => toggleChannel('SMS')}
                className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center space-x-2.5 ${
                  selectedChannels.includes('SMS')
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                    selectedChannels.includes('SMS')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">SMS Alert</h4>
                  <p className="text-[10px] text-slate-500">Mobile SMS</p>
                </div>
              </div>

              {/* Email Card */}
              <div
                onClick={() => toggleChannel('EMAIL')}
                className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-center space-x-2.5 ${
                  selectedChannels.includes('EMAIL')
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                    selectedChannels.includes('EMAIL')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Email</h4>
                  <p className="text-[10px] text-slate-500">SMTP Notice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs: Live Preview vs Dispatch Console */}
          <div className="border-b border-slate-200 flex space-x-4">
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'PREVIEW'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Message & Script Previews
            </button>
            <button
              onClick={() => setActiveTab('DISPATCH')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'DISPATCH'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Live Dispatch Console</span>
              {dispatchResult && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* TAB 1: PREVIEWS */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPreviewSubTab('IVR')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    previewSubTab === 'IVR'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  IVR Voice Prompt
                </button>
                <button
                  onClick={() => setPreviewSubTab('WHATSAPP')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    previewSubTab === 'WHATSAPP'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  WhatsApp Template
                </button>
                <button
                  onClick={() => setPreviewSubTab('SMS')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    previewSubTab === 'SMS'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  SMS Message
                </button>
                <button
                  onClick={() => setPreviewSubTab('EMAIL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    previewSubTab === 'EMAIL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Email Content
                </button>
              </div>

              {/* IVR Voice Script Preview */}
              {previewSubTab === 'IVR' && (
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-4.5 space-y-3 font-sans text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-200">Outbound Speech Synthesis Script</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSpeakIvr}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-colors ${
                        isSpeaking
                          ? 'bg-amber-500 hover:bg-amber-600 text-black'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Audio in Browser</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed italic bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    "{ivrScript}"
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                    <div>
                      <span className="font-semibold text-slate-300">Dialing To:</span> {phone}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">Interactive DTMF:</span> Key 1 (SMS Link), Key 2 (Finance Desk)
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Preview */}
              {previewSubTab === 'WHATSAPP' && (
                <div className="bg-emerald-950 text-white rounded-2xl p-4.5 space-y-3 text-xs border border-emerald-800">
                  <div className="flex justify-between items-center border-b border-emerald-800/80 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-emerald-200">Realtime WhatsApp Direct Message</span>
                    </div>
                    <a
                      href={whatsappDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center space-x-1 transition-colors"
                    >
                      <span>Open WhatsApp Web / App</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-emerald-900/60 p-3.5 rounded-xl border border-emerald-700/40 text-slate-200 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {whatsappText}
                  </div>

                  <div className="text-[11px] text-emerald-300/80 flex items-center justify-between">
                    <span>Recipient: {phone}</span>
                    <span>Includes direct Razorpay test checkout link</span>
                  </div>
                </div>
              )}

              {/* SMS Preview */}
              {previewSubTab === 'SMS' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-semibold border-b border-slate-200 pb-2">
                    <span className="flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>SMS Payload (Direct to {phone})</span>
                    </span>
                    <span className="font-mono text-[10px]">160 chars / GSM-7</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-mono shadow-sm">
                    {smsText}
                  </div>
                </div>
              )}

              {/* Email Preview */}
              {previewSubTab === 'EMAIL' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="text-xs text-slate-600 border-b border-slate-200 pb-2 space-y-1">
                    <div>
                      <span className="font-bold">Subject:</span> {emailSubject}
                    </div>
                    <div>
                      <span className="font-bold">To:</span> {email}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700 shadow-sm">
                    <p>Dear {invoice.customer?.name},</p>
                    <p>
                      This is a friendly reminder that your Brightloop invoice{' '}
                      <strong>{invoice.invoiceNumber}</strong> has an outstanding balance of{' '}
                      <strong className="text-emerald-700">₹{invoice.outstandingAmount?.toLocaleString()}</strong>.
                    </p>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold">
                      Due Date: {dueDateFormatted} • Direct Razorpay Test Mode Checkout Enabled
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISPATCH CONSOLE */}
          {activeTab === 'DISPATCH' && (
            <div className="space-y-4">
              {!dispatchResult ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No active trigger executed yet. Click "Execute Multi-Channel Trigger" below to dispatch alerts.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold">{dispatchResult.message || 'Dispatched successfully!'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Channel execution details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {/* IVR Results */}
                    {dispatchResult.results?.ivr && (
                      <div className="bg-slate-900 text-white rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                          <span className="font-bold text-emerald-400 flex items-center space-x-1">
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>IVR Call</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase">
                            {dispatchResult.results.ivr.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 space-y-0.5">
                          <div><span className="text-slate-400">Duration:</span> {dispatchResult.results.ivr.duration}s</div>
                          <div><span className="text-slate-400">DTMF:</span> Key 1</div>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Results */}
                    {dispatchResult.results?.whatsapp && (
                      <div className="bg-emerald-950 text-white rounded-xl p-3 text-xs space-y-1.5 border border-emerald-800">
                        <div className="flex justify-between items-center border-b border-emerald-800 pb-1">
                          <span className="font-bold text-emerald-300 flex items-center space-x-1">
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-bold uppercase">
                            {dispatchResult.results.whatsapp.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-200/80 space-y-1">
                          <div className="truncate"><span className="text-emerald-400">To:</span> {dispatchResult.results.whatsapp.recipient}</div>
                          <a
                            href={dispatchResult.results.whatsapp.directWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-emerald-300 hover:text-white underline font-semibold text-[10px]"
                          >
                            <span>Open in WhatsApp</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* SMS Results */}
                    {dispatchResult.results?.sms && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                          <span className="font-bold text-blue-700 flex items-center space-x-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>SMS Alert</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">
                            {dispatchResult.results.sms.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <div className="truncate"><span className="text-slate-400">ID:</span> {dispatchResult.results.sms.messageId?.slice(0, 10)}...</div>
                          <div><span className="text-slate-400">To:</span> {dispatchResult.results.sms.recipient}</div>
                        </div>
                      </div>
                    )}

                    {/* Email Results */}
                    {dispatchResult.results?.email && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                          <span className="font-bold text-emerald-700 flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                            {dispatchResult.results.email.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <div className="truncate"><span className="text-slate-400">To:</span> {dispatchResult.results.email.recipient}</div>
                          <div><span className="text-slate-400">Method:</span> Realtime SMTP</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            Outstanding: <span className="font-bold text-emerald-700">₹{invoice.outstandingAmount?.toLocaleString()}</span>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={loading || selectedChannels.length === 0}
              onClick={handleExecuteTrigger}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Dispatching Alerts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Execute Multi-Channel Trigger</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

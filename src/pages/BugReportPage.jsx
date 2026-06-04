import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { statusCourtesyMessage } from '../utils/statusMessages';
import { BUG_SCREENSHOT_BUCKET, attachBugScreenshotUrls } from '../utils/bugScreenshots';

const styles = {
  container: { maxWidth: '600px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '0.98rem', marginBottom: '10px', cursor: 'pointer', textDecoration: 'none', padding: '9px 12px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '10px', padding: '16px', marginBottom: '12px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: '0 0 4px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '0.95rem', fontWeight: 600, margin: 0 },
  card: { background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', padding: '14px', marginBottom: '12px' },
  guidanceBox: { background: '#f0f9ff', border: '2px solid #bfdbfe', color: '#0c2340', borderRadius: '8px', padding: '10px 12px', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.38 },
  form: { display: 'grid', gap: '12px' },
  fieldGroup: { display: 'grid', gap: '5px' },
  label: { fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'block' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', background: '#ffffff' },
  textarea: { width: '100%', padding: '10px 12px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', minHeight: '88px', resize: 'vertical', background: '#ffffff' },
  fileInput: { padding: '10px 12px', border: '2px dashed #dbeafe', borderRadius: '8px', fontSize: '0.92rem', color: '#1e293b', cursor: 'pointer', background: '#f0f9ff' },
  attachedFile: { background: '#f0fdf4', border: '2px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.35 },
  pasteHint: { color: '#64748b', fontSize: '0.84rem', fontWeight: 700, margin: '2px 0 0' },
  inlineProfileButton: { background: 'none', border: 'none', padding: 0, color: '#0369a1', font: 'inherit', fontWeight: 900, cursor: 'pointer', textAlign: 'left' },
  buttons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '4px' },
  submitButton: { padding: '11px', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', transition: 'all 0.2s' },
  cancelButton: { padding: '11px', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', background: '#e5e7eb', color: '#1e293b', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '0.95rem', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontWeight: 600 },
  successBox: { background: '#f0fdf4', border: '2px solid #16a34a', color: '#166534', fontSize: '0.95rem', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontWeight: 600 },
  screenshotPreview: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' },
  screenshotThumb: { width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #dbeafe', position: 'relative' },
  removeButton: { position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900, fontSize: '0.75rem' },
  reportList: { display: 'grid', gap: '12px' },
  reportCard: { background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', padding: '12px' },
  replyCard: { background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', marginTop: '8px' },
};

export default function BugReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const screenshotInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingReply, setSendingReply] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchMyReports = async () => {
      try {
        setReportsLoading(true);

        const { data: reports, error: reportsError } = await supabase
          .from('bug_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        const reportIds = (reports || []).map((report) => report.id);
        let replies = [];
        if (reportIds.length > 0) {
          const { data, error: repliesError } = await supabase
            .from('bug_report_replies')
            .select('*')
            .in('bug_report_id', reportIds)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.error('Error fetching bug report replies:', repliesError);
          } else {
            replies = data || [];
          }
        }

        const reportsWithScreenshots = await attachBugScreenshotUrls(supabase, reports || []);

        const replySenderIds = [...new Set((replies || []).map((reply) => reply.sender_id).filter(Boolean))];
        const { data: senders, error: sendersError } = replySenderIds.length
          ? await supabase
              .from('public_profiles')
              .select('id, full_name')
              .in('id', replySenderIds)
          : { data: [], error: null };

        if (sendersError) throw sendersError;

        const sendersById = Object.fromEntries((senders || []).map((sender) => [sender.id, sender]));
        const repliesByReportId = (replies || []).reduce((byReport, reply) => {
          byReport[reply.bug_report_id] = byReport[reply.bug_report_id] || [];
          byReport[reply.bug_report_id].push({
            ...reply,
            sender: sendersById[reply.sender_id] || null,
          });
          return byReport;
        }, {});

        setMyReports(reportsWithScreenshots.map((report) => ({
          ...report,
          replies: repliesByReportId[report.id] || [],
        })));

        const unreadReplyIds = (replies || [])
          .filter((reply) => reply.sender_id !== user.id && !reply.read_at)
          .map((reply) => reply.id);

        if (unreadReplyIds.length > 0) {
          await supabase
            .from('bug_report_replies')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadReplyIds);
          window.dispatchEvent(new Event('sailing:bug-replies-updated'));
        }
      } catch (err) {
        console.error('Error loading bug report replies:', err);
      } finally {
        setReportsLoading(false);
      }
    };

    fetchMyReports();
  }, [user]);

  if (!user) {
    return <div style={styles.errorBox}>Please sign in to report bugs.</div>;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyScreenshotFile = (file) => {
    setError('');
    setSuccess(false);

    if (!file) {
      setScreenshot(null);
      setScreenshotPreview(null);
      return;
    }

    const fileName = file.name || '';
    const looksLikeImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(fileName);
    if (!looksLikeImage) {
      setScreenshot(null);
      setScreenshotPreview(null);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
      setError('Please attach an image file for the screenshot');
      return;
    }

    const maxSizeMb = 12;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setScreenshot(null);
      setScreenshotPreview(null);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
      setError(`Screenshot must be ${maxSizeMb} MB or smaller`);
      return;
    }

    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleScreenshotChange = (e) => {
    applyScreenshotFile(e.target.files?.[0]);
  };

  const handlePaste = (e) => {
    const clipboardItems = Array.from(e.clipboardData?.items || []);
    const imageItem = clipboardItems.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const clipboardFile = imageItem.getAsFile();
    if (!clipboardFile) return;

    e.preventDefault();
    const extension = clipboardFile.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const pastedScreenshot = new File(
      [clipboardFile],
      `pasted-screenshot-${Date.now()}.${extension}`,
      { type: clipboardFile.type || 'image/png' }
    );
    applyScreenshotFile(pastedScreenshot);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setStatusMessage('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in both title and description');
      return;
    }

    try {
      setLoading(true);
      let screenshotRef = null;
      if (screenshot) {
        setStatusMessage('Uploading screenshot...');
        const rawExt = screenshot.name.split('.').pop() || 'png';
        const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(BUG_SCREENSHOT_BUCKET)
          .upload(filePath, screenshot, {
            cacheControl: '3600',
            contentType: screenshot.type || undefined,
            upsert: false,
          });

        if (uploadError) throw uploadError;
        screenshotRef = filePath;
      }
      setStatusMessage('Submitting bug report...');

      const { data: newReport, error: insertError } = await supabase
        .from('bug_reports')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            screenshot_url: screenshotRef,
          },
        ])
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: acknowledgmentError } = await supabase
        .from('bug_report_replies')
        .insert({
          bug_report_id: newReport.id,
          sender_id: user.id,
          message: statusCourtesyMessage('bug_reports', 'open'),
          read_at: new Date().toISOString(),
        });

      if (acknowledgmentError) throw acknowledgmentError;

      setSuccess(true);
      setFormData({ title: '', description: '' });
      setScreenshot(null);
      setScreenshotPreview(null);
      setStatusMessage('');
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit bug report');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const sendReportReply = async (report) => {
    const message = replyDrafts[report.id] || '';
    if (!message.trim()) return;

    try {
      setSendingReply(report.id);
      const { data, error: replyError } = await supabase
        .from('bug_report_replies')
        .insert({
          bug_report_id: report.id,
          sender_id: user.id,
          message,
        })
        .select()
        .single();

      if (replyError) throw replyError;

      setMyReports((current) => current.map((currentReport) => (
        currentReport.id === report.id
          ? {
              ...currentReport,
              replies: [
                ...(currentReport.replies || []),
                { ...data, sender: { id: user.id, full_name: 'You' } },
              ],
            }
          : currentReport
      )));
      setReplyDrafts((current) => ({ ...current, [report.id]: '' }));
      window.dispatchEvent(new Event('sailing:bug-replies-updated'));
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(null);
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🐛 Report a Bug</h1>
        <p style={styles.headerSubtitle}>Help us improve the app by reporting issues you encounter</p>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Bug report submitted! Thank you for helping us improve.</div>}

        <form onSubmit={handleSubmit} onPaste={handlePaste} style={styles.form}>
          <div style={styles.guidanceBox}>
            Please be clear and specific. Describe what you expected to happen, what you actually saw, and why the result does not seem right. A screenshot is helpful but optional. Thank you!
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Back button not working on profile page"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={styles.textarea}
              placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Screenshot image (optional)</label>
            <p style={styles.pasteHint}>Choose an image file, or paste a copied screenshot while this form is open.</p>
            <input
              ref={screenshotInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.heic,.heif"
              onChange={handleScreenshotChange}
              style={styles.fileInput}
            />
            {screenshot && (
              <div style={styles.attachedFile}>
                Screenshot selected: {screenshot.name || 'image'} {formatFileSize(screenshot.size) && `(${formatFileSize(screenshot.size)})`}
              </div>
            )}
            {screenshotPreview && (
              <div style={styles.screenshotPreview}>
                <div style={{ position: 'relative' }}>
                  <img src={screenshotPreview} alt="Screenshot preview" style={styles.screenshotThumb} />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    style={styles.removeButton}
                    title="Remove screenshot"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={styles.buttons}>
            <button
              type="submit"
              disabled={loading}
              style={{...styles.submitButton, background: loading ? '#9ca3af' : '#06b6d4', opacity: loading ? 0.5 : 1}}
              onMouseEnter={(e) => !loading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && (e.target.style.opacity = '1')}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={styles.cancelButton}
              onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
              onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
            >
              Cancel
            </button>
          </div>
          {statusMessage && <div style={styles.successBox}>{statusMessage}</div>}
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 10px 0' }}>Your Bug Reports</h2>
        {reportsLoading ? (
          <p style={{ color: '#64748b', fontWeight: 700, margin: 0 }}>Loading...</p>
        ) : myReports.length === 0 ? (
          <p style={{ color: '#64748b', fontWeight: 700, margin: 0 }}>No bug reports submitted yet.</p>
        ) : (
          <div style={styles.reportList}>
            {myReports.map((report) => (
              <div key={report.id} style={styles.reportCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/bug-report/${report.id}?returnTo=${encodeURIComponent('/bug-report')}`)}
                    style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0369a1', margin: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {report.title}
                  </button>
                  <span style={{ background: report.status === 'resolved' ? '#dcfce7' : '#fef3c7', color: report.status === 'resolved' ? '#166534' : '#92400e', borderRadius: '999px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'capitalize' }}>
                    {report.status}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                  Submitted {new Date(report.created_at).toLocaleString()}
                </p>
                <p style={{ color: '#475569', margin: 0, lineHeight: 1.38, fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{report.description}</p>
                {report.screenshot_display_url && (
                  <a href={report.screenshot_display_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', color: '#0369a1', fontWeight: 900 }}>
                    View screenshot
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/bug-report/${report.id}?returnTo=${encodeURIComponent('/bug-report')}`)}
                  style={{ display: 'block', marginTop: '8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #0369a1', borderRadius: '8px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' }}
                >
                  Open conversation
                </button>
                {(report.replies || []).map((reply) => (
                  <div key={reply.id} style={styles.replyCard}>
                    <p style={{ margin: '0 0 4px 0', color: '#0c2340', fontWeight: 900 }}>
                      {reply.sender_id ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${reply.sender_id}?returnTo=${encodeURIComponent('/bug-report')}`)}
                          style={styles.inlineProfileButton}
                        >
                          {reply.sender?.full_name || 'Admin'}
                        </button>
                      ) : (
                        reply.sender?.full_name || 'Admin'
                      )} replied {new Date(reply.created_at).toLocaleString()}
                    </p>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{reply.message}</p>
                  </div>
                ))}
                <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                  <textarea
                    value={replyDrafts[report.id] || ''}
                    onChange={(e) => setReplyDrafts((current) => ({ ...current, [report.id]: e.target.value }))}
                    placeholder="Reply in the app..."
                    rows={2}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', fontFamily: 'inherit', fontSize: '0.92rem', resize: 'vertical' }}
                  />
                  <button
                    type="button"
                    onClick={() => sendReportReply(report)}
                    disabled={sendingReply === report.id || !(replyDrafts[report.id] || '').trim()}
                    style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '0.92rem', fontWeight: 900, cursor: sendingReply === report.id ? 'wait' : 'pointer', opacity: sendingReply === report.id || !(replyDrafts[report.id] || '').trim() ? 0.65 : 1 }}
                  >
                    {sendingReply === report.id ? 'Sending...' : 'Send reply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

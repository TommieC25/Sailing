export const BUG_SCREENSHOT_BUCKET = 'bug-report-screenshots';

const isPublicUrl = (value) => /^https?:\/\//i.test(value || '');

export async function getBugScreenshotUrl(supabase, screenshotRef) {
  if (!screenshotRef) return null;
  if (isPublicUrl(screenshotRef)) return screenshotRef;

  try {
    const { data, error } = await supabase.storage
      .from(BUG_SCREENSHOT_BUCKET)
      .createSignedUrl(screenshotRef, 60 * 60);

    if (error) throw error;
    return data?.signedUrl || null;
  } catch (err) {
    console.error('Could not load bug screenshot:', err);
    return null;
  }
}

export async function attachBugScreenshotUrls(supabase, reports) {
  return Promise.all((reports || []).map(async (report) => ({
    ...report,
    screenshot_display_url: await getBugScreenshotUrl(supabase, report.screenshot_url),
  })));
}

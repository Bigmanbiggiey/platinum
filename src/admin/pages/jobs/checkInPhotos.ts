/** After check-in: the job exists, so failed photos are reported, not retried here. */
export function reportPhotoFailures(failed: number) {
  if (failed > 0) {
    alert(
      `${failed} check-in photo(s) didn't upload. The job was created — add them again under Check-in photos.`,
    );
  }
}

import { redirect } from 'next/navigation';

export default async function SuccessPage(props: any) {
  let appointmentId = null;
  if (props.searchParams) {
    const params = await props.searchParams;
    appointmentId = params?.ref;
  }

  // Redirect immediately to the existing Billing & Transactions page
  if (appointmentId) {
    redirect(`/billing?payment=success&ref=${encodeURIComponent(appointmentId)}`);
  }

  redirect('/billing');
}

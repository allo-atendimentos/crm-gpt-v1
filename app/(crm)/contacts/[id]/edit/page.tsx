import ContactForm from '@/components/crm/contact-form'
export default async function Page({params}:any){const {id}=await params;return <ContactForm id={id}/>}

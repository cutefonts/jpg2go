import React, { useState } from 'react';
import { 
  Mail, Send, ArrowLeft, CheckCircle, AlertCircle,
  MessageSquare, Clock, FileText,
  Heart, User, Phone, MapPin
} from 'lucide-react';
import SEO from './SEO';

interface ContactUsProps {
  onBack?: () => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      title: "Email Support",
      description: "Get help with technical issues and general questions",
      contact: "help.jpg2go@gmail.com",
      responseTime: "Usually within 24 hours"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-green-600" />,
      title: "Suggest Tools",
      description: "Questions about features and usage",
      contact: "help.jpg2go@gmail.com",
      responseTime: "Usually within 48 hours"
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      title: "Business Inquiries",
      description: "Partnership opportunities and business questions",
      contact: "help.jpg2go@gmail.com",
      responseTime: "Usually within 3-5 business days"
    }
  ];

  const faqs = [
    {
      question: "Is JPG2GO really free to use?",
      answer: "Yes! JPG2GO is completely free to use with no hidden fees, registration requirements, or usage limits. We believe professional image processing should be accessible to everyone."
    },
    {
      question: "Are my images safe and private?",
      answer: "Absolutely! All image processing happens locally in your browser. Your images never leave your device, are never uploaded to our servers, and are automatically cleared from memory when you close the browser."
    },
    {
      question: "What image formats do you support?",
      answer: "We support 15+ formats including JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF, HEIC, and more. We're constantly adding support for new formats based on user feedback."
    },
    {
      question: "Can I use JPG2GO for commercial projects?",
      answer: "Yes! JPG2GO is perfect for commercial use. Many photographers, designers, and agencies use our tool for client work. The offline processing ensures complete privacy for your commercial projects."
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback: scroll to top and navigate to home
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <SEO
        title="Contact Us | Get in Touch with "
        description="Reach out to JPG2GO for support, feedback, or inquiries. Our team is ready to help with anything you need."
        keywords="contact us, support, feedback, inquiries, JPG2GO"
        canonical="contact"
        ogImage="/images/contact-us-og.jpg"
      
      
      
      
      
      />
      <div className="bg-gray-100 min-h-screen">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-12">
            <div className="flex items-center justify-center gap-4 mb-4" style={{ paddingTop: '10px' }}>
              <button
                onClick={handleBackToHome}
                className="inline-flex items-center space-x-2 text-violet-600 hover:text-violet-700 transition-colors hover:bg-violet-50 px-3 py-2 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                <span>Contact Us</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6 text-center">
              Get in Touch
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed text-center">
              Have questions, feedback, or need help? We're here to assist you. 
              Reach out to us and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Contact Methods */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Methods</h2>
              
              {contactMethods.map((method, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gray-100 rounded-xl">
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{method.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                      <a 
                        href={`mailto:${method.contact}`}
                        className="text-violet-600 hover:text-violet-700 font-medium text-sm transition-colors"
                      >
                        {method.contact}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">{method.responseTime}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Office Hours */}
              <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-6 border border-violet-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Clock className="h-5 w-5 text-violet-600" />
                  <h3 className="font-semibold text-violet-900">Support Hours</h3>
                </div>
                <div className="text-sm text-violet-700 space-y-1">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM (PST)</p>
                  <p>Saturday: 10:00 AM - 4:00 PM (PST)</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                
                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-800">Message Sent Successfully!</h4>
                        <p className="text-sm text-green-700">We'll get back to you within 24 hours.</p>
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-800">Error Sending Message</h4>
                        <p className="text-sm text-red-700">Please try again or contact us directly via email.</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Brief description of your inquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      placeholder="Please provide as much detail as possible..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="h-6 w-6 text-pink-300" />
              <h3 className="text-xl sm:text-2xl font-bold">We're Here to Help!</h3>
            </div>
            <p className="text-violet-100 mb-6 max-w-2xl mx-auto">
              Your feedback helps us improve JPG2GO. Whether you have questions, suggestions, 
              or just want to say hello, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@jpg2go.com"
                className="bg-white text-violet-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Say Hello
              </a>
              <button
                onClick={handleBackToHome}
                className="border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-violet-600 transition-colors"
              >
                Back to JPG2GO
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactUs;
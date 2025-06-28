import React from 'react';
import { 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Shield, 
  Users, 
  Scale, 
  Globe, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import SEO from './SEO';

interface TermsOfServiceProps {
  onBack?: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  const sections = [
    {
      title: "Acceptance of Terms",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      content: [
        "By accessing and using JPG2GO, you accept and agree to be bound by the terms and provision of this agreement.",
        "If you do not agree to abide by the above, please do not use this service.",
        "These terms apply to all visitors, users, and others who access or use the service.",
        "We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of any changes."
      ]
    },
    {
      title: "Service Description",
      icon: <Sparkles className="h-5 w-5 text-violet-600" />,
      content: [
        "JPG2GO is a free online image conversion and editing service that operates entirely in your browser.",
        "We provide tools for converting between various image formats, compressing images, and editing image properties.",
        "All processing occurs client-side using WebAssembly technology, ensuring your images never leave your device."
      ]
    },
    {
      title: "User Responsibilities",
      icon: <Users className="h-5 w-5 text-purple-600" />,
      content: [
        "You are responsible for ensuring you have the right to process and convert any images you upload to the service.",
        "You must not use the service for any unlawful purposes or in violation of any local, state, national, or international law.",
        "You agree not to use the service to process copyrighted material without proper authorization.",
        "You are responsible for maintaining the confidentiality of any sensitive images you process."
      ]
    },
    {
      title: "Privacy and Data Protection",
      icon: <Shield className="h-5 w-5 text-green-600" />,
      content: [
        "Your images are processed entirely within your browser and never transmitted to our servers.",
        "We do not store, collect, or have access to any images you process through our service.",
        "All image data is automatically cleared from your browser's memory when you close the application.",
        "We may collect anonymous usage statistics to improve our service, but no personal data is collected."
      ]
    },
    {
      title: "Intellectual Property",
      icon: <Scale className="h-5 w-5 text-orange-600" />,
      content: [
        "The JPG2GO service, including its design, code, and functionality, is owned by us and protected by copyright laws.",
        "You retain all rights to images you process through our service.",
        "You may not copy, modify, distribute, or reverse engineer any part of our service without explicit permission.",
        "All trademarks, logos, and brand names are the property of their respective owners."
      ]
    },
    {
      title: "Service Availability",
      icon: <Globe className="h-5 w-5 text-blue-600" />,
      content: [
        "We strive to maintain high availability but cannot guarantee uninterrupted service.",
        "The service is provided 'as is' without warranties of any kind, either express or implied.",
        "We reserve the right to modify, suspend, or discontinue the service at any time without notice.",
        "We are not liable for any downtime, data loss, or service interruptions."
      ]
    },
    {
      title: "Limitation of Liability",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      content: [
        "JPG2GO is provided free of charge and without warranty of any kind.",
        "We shall not be liable for any direct, indirect, incidental, special, or consequential damages.",
        "You use the service at your own risk and are responsible for any consequences of its use.",
        "Our total liability shall not exceed the amount you paid for the service (which is zero for free users)."
      ]
    },
    {
      title: "Prohibited Uses",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      content: [
        "Processing illegal, harmful, or offensive content is strictly prohibited.",
        "Attempting to reverse engineer, hack, or compromise the service is forbidden.",
        "Using the service to violate any applicable laws or regulations is not allowed.",
        "Automated or bulk processing that could impact service performance for other users is prohibited."
      ]
    },
    {
      title: "Changes to Terms",
      icon: <Clock className="h-5 w-5 text-gray-600" />,
      content: [
        "We reserve the right to modify these terms at any time without prior notice.",
        "Changes will be effective immediately upon posting on this page.",
        "Your continued use of the service after changes constitutes acceptance of the new terms.",
        "We encourage you to review these terms periodically for any updates."
      ]
    }
  ];

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
        title="Terms of Service | JPG2GO
"
        description="Read the Terms of Service for JPG2GO to understand your rights, responsibilities, and the rules for using our online image tools."
        keywords="terms of service, terms and conditions, JPG2GO, legal, user agreement"
        canonical="terms"
        ogImage="/images/terms-of-service-og.jpg"
      
      
      
      
      
      />
      <div className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <FileText className="h-4 w-4" />
                <span>Terms of Service</span>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Terms and Conditions
            </h1>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Please read these Terms of Service carefully before using JPG2GO. 
              These terms govern your use of our image conversion service.
            </p>
            
            <div className="mt-6 text-sm text-gray-500">
              Last updated: January 2025
            </div>
          </div>

          {/* Key Points */}
          <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-6 mb-12">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Key Points</h3>
                <ul className="text-blue-700 space-y-1">
                  <li>• JPG2GO is free to use with no registration required</li>
                  <li>• Your images are processed locally and never uploaded to our servers</li>
                  <li>• You retain full ownership of all images you process</li>
                  <li>• Service is provided "as is" without warranties</li>
                  <li>• You must have rights to any images you process</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Terms Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    {section.icon}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{section.title}</h2>
                </div>
                
                <div className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <p key={itemIndex} className="text-gray-600 leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Questions About These Terms?</h3>
            <p className="text-violet-100 mb-6 max-w-2xl mx-auto">
              If you have any questions about these Terms of Service or need clarification 
              on any points, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:legal@jpg2go.com"
                className="bg-white text-violet-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Contact Legal Team
              </a>
              <button
                onClick={handleBackToHome}
                className="border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-violet-600 transition-colors"
              >
                Back to JPG2GO
              </button>
            </div>
          </div>

          {/* Agreement Notice */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-800 text-sm">
              <strong>By using JPG2GO, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService; 
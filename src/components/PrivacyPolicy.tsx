import React from 'react';
import { 
  Shield, Eye, Lock, Database, UserCheck,
  ArrowLeft, CheckCircle, FileText, Mail
} from 'lucide-react';
import SEO from './SEO';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  const sections = [
    {
      title: "Information We Collect",
      icon: <Database className="h-5 w-5 text-blue-600" />,
      content: [
        {
          subtitle: "Images and Files",
          text: "JPG2GO processes images entirely within your browser. Your images are never uploaded to our servers, transmitted over the internet, or stored on any external systems. All image processing happens locally on your device using WebAssembly technology."
        },
        {
          subtitle: "Technical Information",
          text: "We may collect basic technical information such as browser type, device information, and usage statistics through privacy-focused analytics. This data is anonymized and used solely to improve our service."
        },
        {
          subtitle: "No Personal Data",
          text: "We do not collect, store, or process any personal information, email addresses, names, or contact details unless you voluntarily provide them through our contact forms."
        }
      ]
    },
    {
      title: "How We Use Your Information",
      icon: <UserCheck className="h-5 w-5 text-green-600" />,
      content: [
        {
          subtitle: "Service Improvement",
          text: "Anonymous usage data helps us understand how users interact with JPG2GO, allowing us to improve features, fix bugs, and enhance performance."
        },
        {
          subtitle: "Technical Support",
          text: "If you contact us for support, we may use the information you provide to respond to your inquiries and resolve technical issues."
        },
        {
          subtitle: "No Third-Party Sharing",
          text: "We never sell, rent, or share your information with third parties for marketing purposes. Your privacy is our top priority."
        }
      ]
    },
    {
      title: "Data Security",
      icon: <Lock className="h-5 w-5 text-purple-600" />,
      content: [
        {
          subtitle: "Local Processing",
          text: "All image processing occurs locally in your browser. Your images never leave your device, providing the highest level of security and privacy."
        },
        {
          subtitle: "Secure Connections",
          text: "Our website uses HTTPS encryption to protect any data transmitted between your browser and our servers."
        },
        {
          subtitle: "No Data Retention",
          text: "Since we don't store your images or personal data, there's no risk of data breaches or unauthorized access to your files."
        }
      ]
    },
    {
      title: "Cookies and Tracking",
      icon: <Eye className="h-5 w-5 text-orange-600" />,
      content: [
        {
          subtitle: "Essential Cookies",
          text: "We use minimal essential cookies to ensure the website functions properly. These cookies do not track your personal information."
        },
        {
          subtitle: "Analytics",
          text: "We may use privacy-focused analytics tools that respect user privacy and comply with data protection regulations."
        },
        {
          subtitle: "No Advertising Cookies",
          text: "We do not use advertising cookies or tracking pixels for marketing purposes."
        }
      ]
    },
    {
      title: "Your Rights",
      icon: <Shield className="h-5 w-5 text-red-600" />,
      content: [
        {
          subtitle: "Data Control",
          text: "Since your images are processed locally, you maintain complete control over your data at all times."
        },
        {
          subtitle: "Contact Us",
          text: "If you have questions about our privacy practices or want to exercise your rights, you can contact us using the information provided in our Contact section."
        },
        {
          subtitle: "Opt-Out",
          text: "You can disable cookies in your browser settings if you prefer not to have any data collected."
        }
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
        title="Privacy Policy | How We Protect Your Data | JPG2GO
"
        description="Review JPG2GO's Privacy Policy to understand our commitment to safeguarding your data and maintaining a secure user experience."
        keywords="privacy policy, data protection, user privacy, security, JPG2GO"
        canonical="privacy"
        ogImage="/images/privacy-policy-og.jpg"
      
      
      
      
      
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
                <Shield className="h-4 w-4" />
                <span>Privacy Policy</span>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Your Privacy Matters
            </h1>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              At JPG2GO, we're committed to protecting your privacy. This policy explains how we handle your data 
              and why our local processing approach ensures maximum privacy protection.
            </p>
            
            <div className="mt-6 text-sm text-gray-500">
              Last updated: January 2025
            </div>
          </div>

          {/* Privacy Guarantee */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 mb-12">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-800 mb-2">100% Privacy Guarantee</h3>
                <p className="text-green-700 leading-relaxed">
                  Your images are processed entirely within your browser using advanced WebAssembly technology. 
                  They never leave your device, are never uploaded to any server, and are automatically cleared 
                  from memory when you close your browser. This ensures complete privacy and security.
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    {section.icon}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{section.title}</h2>
                </div>
                
                <div className="space-y-6">
                  {section.content.map((item, itemIndex) => (
                    <div key={itemIndex}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.subtitle}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Information */}
          <div className="mt-12 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Questions About Privacy?</h3>
            <p className="text-violet-100 mb-6 max-w-2xl mx-auto">
              If you have any questions about this Privacy Policy or our data practices, 
              please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:help.jpg2go@gmail.com"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow hover:opacity-90 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>Contact Us</span>
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

export default PrivacyPolicy;
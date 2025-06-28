import React from 'react';
import { ArrowLeft, Users, Shield, Zap, FileText, Heart, Facebook, Twitter, Linkedin } from 'lucide-react';
import SEO from './SEO';

const AboutUs: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const teamMembers = [
    {
      name: "Alex Chen",
      role: "Founder & CEO",
      image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Former Google engineer with 10+ years in AI and image processing. Passionate about making professional tools accessible to everyone."
    },
    {
      name: "Sarah Johnson",
      role: "Lead AI Engineer",
      image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "PhD in Computer Vision from Stanford. Specializes in machine learning algorithms for image optimization and enhancement."
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Designer",
      image: "https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Award-winning UX designer focused on creating intuitive interfaces for complex technical tools. Previously at Adobe and Figma."
    },
    {
      name: "Emily Zhang",
      role: "Full-Stack Developer",
      image: "https://images.pexels.com/photos/3756681/pexels-photo-3756681.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Expert in web technologies and performance optimization. Ensures JPG2GO runs smoothly across all devices and browsers."
    }
  ];

  const values = [
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: "Privacy First",
      description: "Your images never leave your device. All processing happens locally in your browser, ensuring complete privacy and security."
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: "Performance",
      description: "Lightning-fast processing with GPU acceleration and optimized algorithms that deliver professional results in seconds."
    },
    {
      icon: <Heart className="h-6 w-6 text-red-600" />,
      title: "User-Centric",
      description: "Every feature is designed with users in mind. We listen to feedback and continuously improve the experience."
    },
    {
      icon: <FileText className="h-6 w-6 text-green-600" />,
      title: "Accessibility",
      description: "Professional-grade image processing should be available to everyone, regardless of technical expertise or budget."
    }
  ];

  const milestones = [
    {
      year: "2023",
      title: "The Beginning",
      description: "JPG2GO was founded with a simple mission: make professional image processing accessible to everyone."
    },
    {
      year: "2024",
      title: "AI Integration",
      description: "Launched advanced AI-powered optimization algorithms, revolutionizing how images are processed and compressed."
    },
    {
      year: "2024",
      title: "50K+ Users",
      description: "Reached 50,000 active users worldwide, processing over 2 million images with 99.9% uptime."
    },
    {
      year: "2025",
      title: "Next Generation",
      description: "Introducing cutting-edge features and expanding our AI capabilities for even better results."
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users", icon: <Users className="h-5 w-5" /> },
    { number: "2M+", label: "Images Processed", icon: <FileText className="h-5 w-5" /> },
    { number: "99.9%", label: "Uptime", icon: <Shield className="h-5 w-5" /> },
    { number: "15+", label: "Supported Formats", icon: <FileText className="h-5 w-5" /> }
  ];

  return (
    <>
    <SEO
        title="About Us | Our Mission and Values | JPG2GO
"
        description="JPG2GO is driven by a mission to deliver efficient and high-quality image conversion tools. Get to know our story, values, and goals."
        keywords="about us, JPG2GO, mission, vision, values, online tools"
        canonical="about"
        ogImage="/images/about-us-og.jpg"
    
      
      
      
      
      />
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-violet-50 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <FileText className="h-4 w-4" />
              <span>About JPG2GO</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Revolutionizing Image Processing
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              We're on a mission to democratize professional-grade image processing, 
              making powerful AI tools accessible to creators, businesses, and individuals worldwide.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="text-violet-600">
                    {stat.icon}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stat.number}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-violet-100 text-violet-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <FileText className="h-4 w-4" />
                <span>Our Mission</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Making Professional Tools Accessible
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We believe that everyone should have access to professional-grade image processing tools, 
                regardless of their technical expertise or budget. That's why we created JPG2GO - 
                a powerful, AI-driven image converter that runs entirely in your browser.
              </p>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our commitment to privacy means your images never leave your device, while our 
                advanced algorithms ensure you get the best possible results every time.
              </p>

              <button 
                onClick={() => scrollToSection('converter')}
                className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 inline-flex items-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Try JPG2GO Now</span>
              </button>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 text-white">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-green-300" />
                    <span className="text-lg">100% Privacy Guaranteed</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-green-300" />
                    <span className="text-lg">AI-Powered Optimization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-green-300" />
                    <span className="text-lg">Professional Results</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-green-300" />
                    <span className="text-lg">Free to Use</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do and shape how we build JPG2GO.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{value.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 text-center" style={{color:'#101624'}}>
              Our Journey
            </h2>
            <p className="text-xl text-gray-600">
              From a simple idea to a platform trusted by thousands worldwide.
            </p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-violet-600">{milestone.year}</span>
                      <div className="w-2 h-2 bg-violet-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">{milestone.title}</h3>
                    </div>
                    <p className="text-gray-600">{milestone.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monu Tiwari Profile Card */}
      <section className="flex justify-center items-center py-8 px-2">
        <div className="flex flex-col md:flex-row items-center bg-white rounded-3xl shadow-xl border border-gray-200 p-8 md:p-12 max-w-5xl w-full gap-8">
          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            <img
              src="https://avatars.githubusercontent.com/u/10229899?v=4"
              alt="Monu Tiwari"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-lg"
            />
          </div>
          <div className="flex-1 w-full flex flex-col justify-center items-start">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Monu Tiwari</h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Monu Tiwari is the Founder of JPG2Go, a powerful online image and PDF conversion tool trusted by marketers, designers, and tech-savvy professionals. Backed by over 5 years of expertise in digital marketing, SEO, and web optimization, Monu is dedicated to creating fast, user-friendly tools that enhance productivity and streamline file management. His mission is to empower users with smart digital solutions that save time and deliver results.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#" className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl px-6 py-3 transition-colors text-base">
                <Facebook className="w-5 h-5" /> Facebook
              </a>
              <a href="#" className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl px-6 py-3 transition-colors text-base">
                <Twitter className="w-5 h-5" /> Twitter (X)
              </a>
              <a href="#" className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl px-6 py-3 transition-colors text-base">
                <Linkedin className="w-5 h-5" /> LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Powered by Cutting-Edge Technology
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We leverage the latest advances in AI, web technologies, and image processing 
              to deliver exceptional results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">WebAssembly</h3>
              <p className="text-gray-600">
                Near-native performance in the browser with optimized algorithms 
                for lightning-fast image processing.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Optimization</h3>
              <p className="text-gray-600">
                Machine learning algorithms that analyze your images and apply 
                the perfect settings for optimal results.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy by Design</h3>
              <p className="text-gray-600">
                All processing happens locally in your browser. Your images 
                never leave your device, ensuring complete privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your Images?
            </h2>
            <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
              Join thousands of creators, businesses, and individuals who trust JPG2GO 
              for their image processing needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => scrollToSection('converter')}
                className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Start Converting Now</span>
              </button>
              <button 
                onClick={() => scrollToSection('guide')}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-violet-600 transition-all duration-200 inline-flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Learn More</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default AboutUs;
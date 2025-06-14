import React from 'react';
import { 
  Users, Target, Award, Zap, Shield, Heart, 
  Globe, Sparkles, CheckCircle, Star, Code, 
  Lightbulb, Rocket, Coffee, Image as ImageIcon
} from 'lucide-react';

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
      bio: "Former Google engineer with 10+ years in image processing and web technologies. Passionate about making professional image conversion tools accessible to everyone."
    },
    {
      name: "Sarah Johnson",
      role: "Lead Developer",
      image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Full-stack developer specializing in web technologies and performance optimization. Expert in modern JavaScript frameworks, WebAssembly, and image processing algorithms."
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Designer",
      image: "https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Award-winning UX designer focused on creating intuitive interfaces for complex technical tools like image converters. Previously at Adobe and Figma."
    },
    {
      name: "Emily Zhang",
      role: "Quality Engineer",
      image: "https://images.pexels.com/photos/3756681/pexels-photo-3756681.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Quality assurance specialist ensuring JPG2GO runs smoothly across all devices and browsers. Expert in automated testing and performance monitoring for image processing applications."
    }
  ];

  const values = [
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: "Privacy First",
      description: "Your images never leave your device. All processing happens locally in your browser, ensuring complete privacy and security for all image conversions including JPEG to PNG and PNG to JPG."
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: "Performance",
      description: "Lightning-fast processing with optimized algorithms that deliver professional results in seconds. Perfect for bulk JPEG to PNG conversion and batch image optimization."
    },
    {
      icon: <Heart className="h-6 w-6 text-red-600" />,
      title: "User-Centric",
      description: "Every feature is designed with users in mind. We listen to feedback and continuously improve the image conversion experience for JPEG, PNG, WebP and more formats."
    },
    {
      icon: <Globe className="h-6 w-6 text-green-600" />,
      title: "Accessibility",
      description: "Professional-grade image processing should be available to everyone, regardless of technical expertise or budget. Free JPEG to PNG conversion for all users worldwide."
    }
  ];

  const milestones = [
    {
      year: "2023",
      title: "The Beginning",
      description: "JPG2GO was founded with a simple mission: make professional image conversion accessible to everyone. Started with basic JPEG to PNG and PNG to JPG conversion features."
    },
    {
      year: "2024",
      title: "Enhanced Features",
      description: "Launched advanced processing algorithms and expanded format support including WebP, AVIF, and HEIC, revolutionizing how images are converted and optimized online."
    },
    {
      year: "2024",
      title: "50K+ Users",
      description: "Reached 50,000 active users worldwide, processing over 2 million images with 99.9% uptime. Became the go-to tool for JPEG to PNG conversion and image optimization."
    },
    {
      year: "2025",
      title: "Next Generation",
      description: "Introducing cutting-edge AI features and expanding our capabilities for even better image conversion results. Leading the future of online image processing."
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users", icon: <Users className="h-5 w-5" /> },
    { number: "2M+", label: "Images Converted", icon: <ImageIcon className="h-5 w-5" /> },
    { number: "99.9%", label: "Uptime", icon: <Award className="h-5 w-5" /> },
    { number: "15+", label: "Supported Formats", icon: <Star className="h-5 w-5" /> }
  ];

  return (
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
              <Sparkles className="h-4 w-4" />
              <span>About JPG2GO</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Revolutionizing Image Conversion
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              We're on a mission to democratize professional-grade image processing, 
              making powerful tools for JPEG to PNG conversion, PNG to JPG optimization, and WebP creation accessible to creators, businesses, and individuals worldwide.
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
                <Target className="h-4 w-4" />
                <span>Our Mission</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Making Professional Image Conversion Tools Accessible
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We believe that everyone should have access to professional-grade image processing tools for JPEG to PNG conversion, PNG to JPG optimization, and more, 
                regardless of their technical expertise or budget. That's why we created JPG2GO - 
                a powerful image converter that runs entirely in your browser.
              </p>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our commitment to privacy means your images never leave your device during conversion, while our 
                advanced algorithms ensure you get the best possible results every time, whether you're converting JPEG to PNG or optimizing images for web use.
              </p>

              <button 
                onClick={() => scrollToSection('converter')}
                className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 inline-flex items-center space-x-2"
              >
                <Rocket className="h-5 w-5" />
                <span>Try JPG2GO Now</span>
              </button>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 text-white">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-300" />
                    <span className="text-lg">100% Privacy Guaranteed</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-300" />
                    <span className="text-lg">Professional JPEG to PNG Conversion</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-300" />
                    <span className="text-lg">Lightning Fast Processing</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-300" />
                    <span className="text-lg">Free to Use Forever</span>
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
              These principles guide everything we do and shape how we build JPG2GO's image conversion platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <article key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{value.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Our Journey
            </h2>
            <p className="text-xl text-gray-600">
              From a simple idea to a platform trusted by thousands worldwide for image conversion.
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

      {/* Team Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The passionate individuals behind JPG2GO, working to make image conversion 
              better for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <article key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={member.image}
                    alt={`${member.name} - ${member.role} at JPG2GO`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-violet-600 font-medium mb-3">{member.role}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
                </div>
              </article>
            ))}
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
              We leverage the latest advances in web technologies and image processing 
              to deliver exceptional JPEG to PNG conversion and optimization results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Code className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">WebAssembly</h3>
              <p className="text-gray-600">
                Near-native performance in the browser with optimized algorithms 
                for lightning-fast image processing and conversion.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Optimization</h3>
              <p className="text-gray-600">
                Advanced algorithms that analyze your images and apply 
                the perfect settings for optimal JPEG to PNG conversion results.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy by Design</h3>
              <p className="text-gray-600">
                All processing happens locally in your browser. Your images 
                never leave your device during conversion, ensuring complete privacy.
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
              for their image conversion needs including JPEG to PNG, PNG to JPG, and WebP optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => scrollToSection('converter')}
                className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center space-x-2"
              >
                <Coffee className="h-5 w-5" />
                <span>Start Converting Now</span>
              </button>
              <button 
                onClick={() => scrollToSection('guide')}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-violet-600 transition-all duration-200 inline-flex items-center justify-center space-x-2"
              >
                <Lightbulb className="h-5 w-5" />
                <span>Learn More</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
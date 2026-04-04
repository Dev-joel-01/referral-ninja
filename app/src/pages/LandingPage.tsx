import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/layout/GlassCard";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Briefcase, 
  Users, 
  Wallet,
  CheckCircle,
  Shield,
  MapPin,
  Globe,
  GraduationCap,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const taskCategories = [
    {
      icon: <Globe className="w-8 h-8 text-[#39FF14]" />,
      title: "Remote Jobs",
      desc: "Apply to international remote positions. Work from anywhere in Kenya.",
      examples: ["Data entry", "Virtual assistant", "Online tutoring", "Content writing"]
    },
    {
      icon: <GraduationCap className="w-8 h-8 text-[#39FF14]" />,
      title: "Local Internships",
      desc: "Find internship opportunities with Kenyan companies and NGOs.",
      examples: ["Marketing intern", "IT support", "Admin assistant", "Research intern"]
    },
    {
      icon: <MapPin className="w-8 h-8 text-[#39FF14]" />,
      title: "Local Jobs",
      desc: "Discover full-time and part-time positions near you.",
      examples: ["Sales representative", "Customer service", "Delivery driver", "Retail staff"]
    }
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Register",
      desc: "Pay KSh 200 one-time fee. Get lifetime access to all tasks and features."
    },
    {
      step: "02",
      title: "Browse Tasks",
      desc: "Explore remote jobs, internships, and local positions with detailed guidelines."
    },
    {
      step: "03",
      title: "Apply",
      desc: "Follow the application guidelines. Each task shows exactly how to apply."
    },
    {
      step: "04",
      title: "Get Hired",
      desc: "Connect directly with employers. We provide the leads, you do the rest."
    }
  ];

  const referralInfo = {
    amount: "KSh 100",
    minWithdrawal: "KSh 500",
    note: "Referral earnings are separate from task income. Withdraw when you hit the minimum."
  };

  return (
    <div className="min-h-screen bg-[#050B06] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#050B06]/95 backdrop-blur-md border-b border-[#39FF14]/20" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              <span className="text-2xl font-bold bg-gradient-to-r from-[#39FF14] to-[#E8FFE8] bg-clip-text text-transparent">
                Referral Ninja
              </span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#tasks" className="text-[#9AB89A] hover:text-[#39FF14] transition">Tasks</a>
              <a href="#how-it-works" className="text-[#9AB89A] hover:text-[#39FF14] transition">How It Works</a>
              <a href="#referrals" className="text-[#9AB89A] hover:text-[#39FF14] transition">Refer & Earn</a>
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
                className="border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                className="bg-[#39FF14] text-[#050B06] hover:bg-[#2de00f]"
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-[#39FF14]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A1A0D] border-b border-[#39FF14]/20">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <a href="#tasks" className="block py-2 text-[#9AB89A]">Tasks</a>
              <a href="#how-it-works" className="block py-2 text-[#9AB89A]">How It Works</a>
              <a href="#referrals" className="block py-2 text-[#9AB89A]">Refer & Earn</a>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full mt-2 border-[#39FF14] text-[#39FF14]"
                variant="outline"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                className="w-full mt-2 bg-[#39FF14] text-[#050B06]"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 pt-32 pb-20 md:pt-48 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-sm font-medium mb-6">
                Find Work in Kenya
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Discover{" "}
                <span className="bg-gradient-to-r from-[#39FF14] to-[#E8FFE8] bg-clip-text text-transparent">
                  Remote Jobs, Internships & Local Work
                </span>
              </h1>
              <p className="text-lg text-[#9AB89A] mb-8 max-w-lg">
                Browse curated tasks with clear application guidelines. One-time registration of KSh 200. 
                Plus, earn extra by referring friends.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={() => navigate('/register')}
                  className="bg-[#39FF14] text-[#050B06] hover:bg-[#2de00f] text-lg px-8 py-6 font-semibold"
                >
                  Browse Tasks <ArrowRight className="ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="border-[#39FF14]/50 text-[#9AB89A] hover:bg-[#39FF14]/10 text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#9AB89A]">
                <CheckCircle className="w-4 h-4 text-[#39FF14]" />
                <span>Lifetime access after registration</span>
              </div>
            </div>
            <div className="relative">
              <GlassCard className="p-6 relative z-10">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-[#39FF14]" />
                  Available Task Types
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#050B06] rounded-lg">
                    <span className="text-[#E8FFE8]">Remote Jobs</span>
                    <span className="text-[#39FF14] text-sm">Work from home</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#050B06] rounded-lg">
                    <span className="text-[#E8FFE8]">Local Internships</span>
                    <span className="text-[#39FF14] text-sm">Gain experience</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#050B06] rounded-lg">
                    <span className="text-[#E8FFE8]">Local Jobs</span>
                    <span className="text-[#39FF14] text-sm">Full & part-time</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-[#39FF14]/10 rounded-lg">
                  <p className="text-sm text-[#9AB89A]">
                    Each task includes detailed application guidelines
                  </p>
                </div>
              </GlassCard>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#39FF14]/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Task Categories */}
      <section id="tasks" className="py-20 px-4 bg-[#0A1A0D]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What You'll Find Inside</h2>
            <p className="text-[#9AB89A] max-w-2xl mx-auto">
              Three categories of opportunities. Each with clear guidelines on how to apply.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {taskCategories.map((category, idx) => (
              <GlassCard key={idx} className="p-6 hover:border-[#39FF14]/30 transition">
                <div className="mb-4">{category.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                <p className="text-[#9AB89A] mb-4 text-sm">{category.desc}</p>
                <div className="space-y-2">
                  <p className="text-xs text-[#39FF14] uppercase tracking-wider">Examples:</p>
                  {category.examples.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#E8FFE8]">
                      <CheckCircle className="w-3 h-3 text-[#39FF14]" />
                      {ex}
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-[#9AB89A]">Simple process. Real opportunities.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {howItWorks.map((step, idx) => (
              <div key={idx} className="relative">
                <GlassCard className="p-6 h-full">
                  <div className="text-4xl font-bold text-[#39FF14]/30 mb-4">{step.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-[#9AB89A] text-sm">{step.desc}</p>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referrals Section - Honest & Transparent */}
      <section id="referrals" className="py-20 px-4 bg-[#0A1A0D]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-sm font-medium mb-6">
                Side Income
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Refer Friends,{" "}
                <span className="text-[#39FF14]">Earn Extra</span>
              </h2>
              <p className="text-[#9AB89A] mb-6">
                Sharing your referral link is optional, but it's an easy way to earn additional income 
                while helping friends find work opportunities.
              </p>
              
              <GlassCard className="p-6 mb-6 border-[#39FF14]/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#39FF14]/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#39FF14]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#39FF14]">{referralInfo.amount}</div>
                    <div className="text-sm text-[#9AB89A]">Per successful referral</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#39FF14]/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-[#39FF14]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#39FF14]">{referralInfo.minWithdrawal}</div>
                    <div className="text-sm text-[#9AB89A]">Minimum withdrawal</div>
                  </div>
                </div>
              </GlassCard>

              <div className="space-y-3 text-sm text-[#9AB89A]">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#39FF14] mt-0.5 flex-shrink-0" />
                  <span>You earn when friends register and pay KSh 200</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#39FF14] mt-0.5 flex-shrink-0" />
                  <span>Withdraw referral earnings separately when you reach KSh 500</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#39FF14] mt-0.5 flex-shrink-0" />
                  <span>Track all earnings in your dashboard</span>
                </div>
              </div>
            </div>
            
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6">Referral Example</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#050B06] rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#9AB89A]">You refer 5 friends</span>
                    <span className="text-[#39FF14] font-semibold">KSh 500</span>
                  </div>
                  <div className="text-xs text-[#9AB89A]">Ready to withdraw</div>
                </div>
                <div className="p-4 bg-[#050B06] rounded-lg opacity-50">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#9AB89A]">You refer 3 friends</span>
                    <span className="text-[#E8FFE8] font-semibold">KSh 300</span>
                  </div>
                  <div className="text-xs text-[#9AB89A]">Need KSh 200 more to withdraw</div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-[#39FF14]/5 rounded-lg border border-[#39FF14]/20">
                <p className="text-sm text-[#9AB89A]">
                  <strong className="text-[#E8FFE8]">Note:</strong> Referral earnings are kept separate 
                  from any task-related income. You can only withdraw referral money when you hit the KSh 500 minimum.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Trust/Transparency Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">What You Get</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <GlassCard className="p-6 text-center">
              <Briefcase className="w-10 h-10 text-[#39FF14] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Task Access</h3>
              <p className="text-sm text-[#9AB89A]">Browse all remote jobs, internships, and local positions</p>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <CheckCircle className="w-10 h-10 text-[#39FF14] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Clear Guidelines</h3>
              <p className="text-sm text-[#9AB89A]">Every task includes detailed application instructions</p>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <Wallet className="w-10 h-10 text-[#39FF14] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Referral Earnings</h3>
              <p className="text-sm text-[#9AB89A]">Optional side income by sharing your link</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-[#0A1A0D]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Work?
          </h2>
          <p className="text-[#9AB89A] mb-8">
            One-time registration of KSh 200. Lifetime access to task listings. 
            Optional referral program to earn extra.
          </p>
          <GlassCard className="p-8 max-w-md mx-auto border-[#39FF14]/20">
            <div className="text-4xl font-bold text-[#39FF14] mb-2">KSh 200</div>
            <div className="text-[#9AB89A] mb-6">One-time registration</div>
            <ul className="text-left space-y-3 mb-8 text-sm">
              {[
                "Lifetime access to all tasks",
                "Detailed application guidelines",
                "New listings added regularly",
                "Optional: KSh 100 per referral",
                "Withdraw referrals at KSh 500 min"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-[#E8FFE8]">
                  <CheckCircle className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => navigate('/register')}
              className="w-full bg-[#39FF14] text-[#050B06] hover:bg-[#2de00f] text-lg py-6 font-semibold"
            >
              Get Started
            </Button>
          </GlassCard>
          <p className="mt-6 text-sm text-[#9AB89A]">
            Questions? Email support@referralninja.co.ke
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[#39FF14]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-[#39FF14] mb-4">Referral Ninja</h3>
              <p className="text-[#9AB89A] text-sm">
                Connecting Kenyans with work opportunities. Remote jobs, internships, and local positions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-[#9AB89A]">
                <li><a href="#tasks" className="hover:text-[#39FF14]">Browse Tasks</a></li>
                <li><a href="#how-it-works" className="hover:text-[#39FF14]">How It Works</a></li>
                <li><a href="#referrals" className="hover:text-[#39FF14]">Refer & Earn</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-[#9AB89A]">
                <li>support@referralninja.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#39FF14]/10 text-center text-[#9AB89A] text-sm">
            <p>&copy; 2026 Referral Ninja. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
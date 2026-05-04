import homepageImage from "../assets/homepage_image.jpeg";
import feature1 from "../assets/Feature1.png"
import feature2 from "../assets/Feature2.png"
import feature3 from "../assets/Feature3.png"
import Footer from "../components/Footer";
import Button from "../components/ui/Button";
import { Link } from "react-router-dom";


const HomePage = () => {
    return (
        <>
                                <div className="min-h-screen w-full bg-[#eaf6f1]">
                        {/* Hero */}
                        <div className="min-h-screen w-full">
                                        <div className="mx-auto flex min-h-screen max-w-screen-2xl items-center px-6 sm:px-10 lg:px-16 xl:px-24 py-10 sm:py-16">
                                            <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-semibold text-emerald-900">
                                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                            Trusted by 50,000+ commuters
                                        </div>

                                                            <h1 className="mt-6 text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900">
                                            Smarter rides,<br />shared <span className="text-emerald-600">together</span>.
                                        </h1>
                                                            <p className="mt-5 max-w-2xl text-lg sm:text-xl xl:text-2xl text-slate-600">
                                            Save money, cut emissions, and meet fellow commuters. CarPool System connects drivers and passengers going the same way.
                                        </p>

                                        <div className="mt-8 flex flex-wrap gap-3">
                                            <Link to="/search">
                                                <Button className="rounded-2xl px-6 py-3">Find a ride</Button>
                                            </Link>
                                            <Link to="/share">
                                                <Button variant="secondary" className="rounded-2xl px-6 py-3">Offer your trip</Button>
                                            </Link>
                                        </div>

                                        {/* Stats */}
                                                            <div className="mt-10 grid grid-cols-3 gap-6 max-w-2xl">
                                            <div>
                                                                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">50K+</div>
                                                                    <div className="text-sm sm:text-base text-slate-600">Active riders</div>
                                            </div>
                                            <div className="border-l border-emerald-200 pl-6">
                                                                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">1.2M</div>
                                                                    <div className="text-sm sm:text-base text-slate-600">Rides shared</div>
                                            </div>
                                            <div className="border-l border-emerald-200 pl-6">
                                                                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">340t</div>
                                                                    <div className="text-sm sm:text-base text-slate-600">CO₂ saved</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hero visual */}
                                                        <div className="relative">
                                                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl max-w-xl ml-auto">
                                            <img
                                                src={homepageImage}
                                                alt="Ride preview"
                                                className="w-full rounded-2xl bg-[#dff2ea] object-cover"
                                            />
                                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
                                                Where are you headed today?
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                                    <div className="bg-[#f5f3ee]">
                                        <div className="mx-auto max-w-screen-2xl px-6 sm:px-10 lg:px-16 xl:px-24 py-14">
                                <div className="max-w-3xl">
                                    <div className="text-sm font-bold tracking-widest text-emerald-700">FEATURES</div>
                                                <h2 className="mt-2 text-4xl sm:text-5xl xl:text-6xl font-extrabold text-slate-900">Everything you need to ride smarter</h2>
                                                <p className="mt-3 text-lg sm:text-xl text-slate-600">Simple tools for drivers and passengers alike.</p>
                                </div>

                                <div className="mt-10 grid gap-6 md:grid-cols-3">
                                    <div className="rounded-3xl border border-slate-200 bg-[#f7f5ef] p-8 shadow-sm">
                                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 grid place-items-center mb-5">
                                            <img src={feature1} alt="Search" className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Search rides</h3>
                                        <p className="mt-3 text-slate-600">
                                            Find available trips heading your way. Filter by time, seats, and price in seconds.
                                        </p>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-[#f7f5ef] p-8 shadow-sm">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 grid place-items-center mb-5">
                                            <img src={feature2} alt="Share" className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Share your trip</h3>
                                        <p className="mt-3 text-slate-600">
                                            Post your route, set your price, and let passengers join your journey effortlessly.
                                        </p>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-[#f7f5ef] p-8 shadow-sm">
                                        <div className="h-12 w-12 rounded-2xl bg-amber-50 grid place-items-center mb-5">
                                            <img src={feature3} alt="Trips" className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Manage trips</h3>
                                        <p className="mt-3 text-slate-600">
                                            Review requests, track ride status, and keep everyone in the loop automatically.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* How it works */}
                                            <div className="mx-auto max-w-screen-2xl px-6 sm:px-10 lg:px-16 xl:px-24 pb-16">
                                <div className="text-sm font-bold tracking-widest text-emerald-700">HOW IT WORKS</div>
                                                <h2 className="mt-2 text-5xl sm:text-6xl xl:text-7xl font-extrabold text-slate-900">Four steps to your next ride</h2>

                                <div className="mt-10 grid gap-10 md:grid-cols-4">
                                    {[{
                                        n: 1,
                                        title: 'Create an account',
                                        desc: 'Sign up in under a minute with your email or phone number.',
                                    }, {
                                        n: 2,
                                        title: 'Search or post',
                                        desc: 'Find a ride going your way or offer your own trip to others.',
                                    }, {
                                        n: 3,
                                        title: 'Confirm & connect',
                                        desc: 'Driver approves, both sides get notified with details.',
                                    }, {
                                        n: 4,
                                        title: 'Ride together',
                                        desc: 'Meet at the pickup point, travel together, save money.',
                                    }].map((s) => (
                                        <div key={s.n} className="space-y-3">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full border border-slate-300 bg-white grid place-items-center font-bold text-emerald-700">
                                                    {s.n}
                                                </div>
                                                <div className="h-px flex-1 bg-slate-300" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                                            <p className="text-slate-600">{s.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                                    <div className="bg-emerald-900">
                                        <div className="mx-auto max-w-screen-2xl px-6 sm:px-10 lg:px-16 xl:px-24 py-16">
                                <div className="rounded-3xl bg-emerald-800/40 px-6 py-14 text-center">
                                                <h2 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white">Ready to share your next ride?</h2>
                                                <p className="mt-4 text-lg sm:text-xl text-emerald-100">Join thousands of commuters already saving time and money.</p>

                                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                                        <Link to="/register">
                                            <Button className="rounded-2xl px-7 py-3">Get started — it’s free</Button>
                                        </Link>
                                        <Link to="/search">
                                            <Button variant="secondary" className="rounded-2xl px-7 py-3">Learn more</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Footer />
        </>
    );
};

export default HomePage;
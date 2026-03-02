import { OnboardingCard } from "@/components/auth/OnboardingCard";

export default function OnboardingPage() {
    return (
        <div className="flex min-h-screen bg-background text-foreground items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none" />
            <div className="relative z-10 w-full flex justify-center">
                <OnboardingCard />
            </div>
        </div>
    );
}

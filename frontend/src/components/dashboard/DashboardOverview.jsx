import WelcomeBanner from './WelcomeBanner'
import StatsOverviewGrid from './StatsOverviewGrid'
import EnrolledSubjectsGrid from './EnrolledSubjectsGrid'
import TrendingQuestions from './TrendingQuestions'
import ActivityTimeline from './ActivityTimeline'

export default function DashboardOverview({ currentUser, onNavigateTab }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Banner Card */}
      <WelcomeBanner
        currentUser={currentUser}
        onNavigateTab={onNavigateTab}
      />

      {/* 2. Top Stats Overview Grid (4 Cards) */}
      <section aria-label="Academic Statistics">
        <StatsOverviewGrid currentUser={currentUser} />
      </section>

      {/* 3. Enrolled Subjects Grid */}
      <section aria-label="Enrolled Subjects">
        <EnrolledSubjectsGrid onNavigateTab={onNavigateTab} />
      </section>

      {/* 4. Two-Column Split: 65% Trending Questions / 35% Activity Timeline */}
      <section aria-label="Trending Doubts and Recent Activity">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Column (~65% width) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <TrendingQuestions onNavigateTab={onNavigateTab} />
          </div>

          {/* Right Sidebar Column (~35% width) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <ActivityTimeline onNavigateTab={onNavigateTab} />
          </div>
        </div>
      </section>
    </div>
  )
}

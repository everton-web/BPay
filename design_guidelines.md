# Design Guidelines: Plataforma de Gestão de Cobranças PIX

## Design Approach
**System-Based with Brazilian Fintech Inspiration**
- Primary reference: Material Design for dashboard components
- Visual inspiration: Nubank (clean, trustworthy), PagSeguro (functional clarity)
- Principle: Data clarity with approachable professionalism

## Typography
**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Headings: 600-700 weight
- Body: 400-500 weight
- Data/Numbers: 600 weight (tabular figures)

**Hierarchy:**
- Page titles: text-3xl to text-4xl font-bold
- Section headers: text-xl to text-2xl font-semibold
- Card titles: text-lg font-semibold
- Body text: text-base
- Small data labels: text-sm text-gray-600
- Financial values: text-lg to text-2xl font-semibold (emphasized)

## Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Container margins: mx-auto with max-w-7xl

**Grid Structure:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Data tables: Full-width responsive with horizontal scroll on mobile
- Forms: max-w-2xl single column with clear field grouping

## Component Library

**Navigation:**
- Sidebar navigation (fixed left, desktop only)
- Top header with breadcrumbs and user menu
- Mobile: Hamburger menu with slide-out drawer
- Active states: Subtle background fill with left border accent

**Dashboard Cards:**
- White background with subtle shadow (shadow-sm)
- Rounded corners (rounded-lg)
- Header with icon + title, large numerical value, subtitle with trend indicator
- Icons from Heroicons (via CDN)

**Data Tables:**
- Striped rows for readability (even rows with bg-gray-50)
- Sticky header on scroll
- Status badges: rounded-full px-3 py-1 with semantic backgrounds
- Action buttons: Icon-only for compact display
- Filters: Horizontal filter bar above table with dropdowns and search

**Charts:**
- Use Chart.js library
- Line chart: Recebimentos diários (smooth curves, grid lines)
- Donut chart: Inadimplência breakdown (show percentage in center)
- Bar chart: Comparison views where needed

**Forms:**
- Labels above inputs (text-sm font-medium)
- Input fields: border rounded-md with focus ring
- Clear validation states (green checkmark, red error message)
- Required fields marked with asterisk

**Status Indicators:**
- Pago: Green badge with checkmark icon
- Atrasado: Red badge with alert icon
- Em Aberto: Yellow/orange badge with clock icon
- Pending: Gray badge

**Modals/Overlays:**
- Full-screen on mobile, centered card on desktop
- Backdrop overlay with blur
- QR Code display: Large centered with copy button below
- Confirmation dialogs: Compact with clear action buttons

**Buttons:**
- Primary actions: Solid fill, medium size (px-4 py-2)
- Secondary: Outline style
- Destructive: Red variant for delete actions
- Icon buttons: p-2 with rounded hover state

## Page-Specific Layouts

**Dashboard Home:**
- 4-column metric cards at top (faturado, recebido, em aberto, atrasado)
- Two-column below: Line chart (left 2/3) + Donut chart (right 1/3)
- Recent transactions table at bottom (5-10 rows with "Ver todos" link)

**Lista de Cobranças:**
- Filter bar with dropdowns (Status, Turma, Aluno) and date range picker
- Export button (top right)
- Full-width data table with pagination
- Quick actions column (Ver detalhes, Enviar lembrete, Cancelar)

**Cadastro de Alunos:**
- Form layout in centered container (max-w-2xl)
- Sections: Dados Pessoais, Informações do Curso, Configurações de Cobrança
- Save/Cancel buttons fixed at bottom on mobile, inline on desktop

**Detalhes do Aluno:**
- Top section: Student info card (left) + Quick stats (right)
- Tabs: Histórico de Pagamentos, Cobranças Ativas, Editar Dados
- Timeline view for payment history

## Images
No hero images needed - this is a functional admin dashboard. Use:
- Icons for all navigation and status indicators (Heroicons)
- QR Code display for payment (generated dynamically)
- Empty state illustrations for when no data exists (simple SVG placeholders with helpful text)

## Accessibility
- All form inputs with proper labels and aria-labels
- Keyboard navigation throughout (tab order, escape to close modals)
- Focus indicators on all interactive elements (ring-2)
- High contrast for text on all backgrounds (WCAG AA minimum)
- Screen reader announcements for status changes

## Animations
Minimal and purposeful only:
- Skeleton loaders for data fetching
- Smooth transitions for modal open/close (150-200ms)
- Hover states on interactive elements (100ms)
- No scroll-based or decorative animations
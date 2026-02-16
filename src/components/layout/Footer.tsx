import Link from 'next/link'
import { siteConfig, footerLinks } from '@/lib/config'

export function Footer() {
  return (
    <footer className="bg-secondary text-white">
      <div className="max-width content-padding py-12 md:py-16">
        {/* Navigation Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1 */}
          <ul className="space-y-3">
            {footerLinks.primary.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>

          {/* Column 2 */}
          <ul className="space-y-3">
            {footerLinks.secondary.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>

          {/* Column 3 */}
          <ul className="space-y-3">
            {footerLinks.tertiary.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>

          {/* Column 4 - Contact */}
          <ul className="space-y-3">
            <li>
              <Link
                href="/contact"
                className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <a
                href={siteConfig.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
              >
                {siteConfig.address.street}
                <br />
                {siteConfig.address.city}, {siteConfig.address.state}{' '}
                {siteConfig.address.zip}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.email.info}`}
                className="text-white hover:text-primary-light transition-colors duration-[var(--transition-button)]"
              >
                {siteConfig.email.info}
              </a>
            </li>
          </ul>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-6 pt-8 border-t border-white/20">
          <a
            href={`mailto:${siteConfig.email.hello}`}
            className="text-white hover:text-primary-light transition-colors"
            aria-label="Email"
          >
            <EmailIcon />
          </a>
          <a
            href={siteConfig.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-light transition-colors"
            aria-label="LinkedIn"
          >
            <LinkedInIcon />
          </a>
          <a
            href={siteConfig.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-light transition-colors"
            aria-label="Twitter"
          >
            <TwitterIcon />
          </a>

          {/* Center Logo */}
          <span className="font-serif text-xl tracking-wider">GoInvo</span>

          <a
            href={siteConfig.social.medium}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-light transition-colors"
            aria-label="Medium"
          >
            <MediumIcon />
          </a>
          <a
            href={siteConfig.social.flickr}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-light transition-colors"
            aria-label="Flickr"
          >
            <FlickrIcon />
          </a>
          <a
            href={siteConfig.social.soundcloud}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-light transition-colors"
            aria-label="SoundCloud"
          >
            <SoundCloudIcon />
          </a>
        </div>
      </div>
    </footer>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  )
}

function MediumIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  )
}

function FlickrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 12c0 3.074 2.494 5.564 5.565 5.564 3.075 0 5.569-2.49 5.569-5.564S8.641 6.436 5.565 6.436C2.495 6.436 0 8.926 0 12zm12.866 0c0 3.074 2.493 5.564 5.567 5.564C21.496 17.564 24 15.074 24 12s-2.504-5.564-5.567-5.564c-3.074 0-5.567 2.49-5.567 5.564z" />
    </svg>
  )
}

function SoundCloudIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.053 0 .091-.04.098-.094l.201-1.282-.201-1.332c-.007-.06-.045-.094-.098-.094zm1.83-1.229c-.063 0-.117.044-.12.113l-.218 2.543.218 2.449c.003.063.057.113.12.113s.114-.05.12-.113l.244-2.449-.244-2.543c-.006-.07-.057-.113-.12-.113zm.957-.477c-.074 0-.132.06-.135.127l-.2 3.02.2 2.728c.003.07.061.127.135.127.07 0 .129-.057.132-.127l.227-2.728-.227-3.02c-.003-.07-.062-.127-.132-.127zm1.025-.258c-.079 0-.147.067-.148.145l-.17 3.277.17 2.8c.001.08.069.145.148.145.08 0 .145-.065.15-.145l.194-2.8-.194-3.277c-.005-.08-.07-.145-.15-.145zm1.079-.121c-.088 0-.163.074-.163.161l-.152 3.397.152 2.842c0 .09.075.161.163.161s.16-.071.164-.161l.17-2.842-.17-3.397c-.004-.087-.076-.161-.164-.161zm1.075.066c-.094 0-.171.081-.176.176l-.135 3.331.135 2.861c.005.096.082.176.176.176.096 0 .176-.08.177-.176l.154-2.861-.154-3.331c-.001-.095-.081-.176-.177-.176zm1.105-.357c-.1 0-.18.087-.186.191l-.12 3.688.12 2.871c.006.1.086.191.186.191.098 0 .18-.09.182-.191l.135-2.871-.135-3.688c-.002-.104-.084-.191-.182-.191zm1.079.348c-.108 0-.2.091-.2.203l-.1 3.14.1 2.881c0 .112.092.203.2.203.105 0 .199-.091.2-.203l.114-2.881-.114-3.14c-.001-.112-.095-.203-.2-.203zm1.091-.434c-.113 0-.204.097-.209.213l-.084 3.574.084 2.889c.005.116.096.213.209.213.113 0 .204-.097.205-.213l.098-2.889-.098-3.574c-.001-.116-.092-.213-.205-.213zm1.12.167c-.12 0-.22.104-.22.229l-.064 3.405.064 2.891c0 .125.1.229.22.229.12 0 .22-.104.22-.229l.074-2.891-.074-3.405c0-.125-.1-.229-.22-.229zm1.134-.591c-.126 0-.235.108-.235.241l-.045 3.997.045 2.886c0 .133.109.241.235.241.123 0 .231-.108.236-.241l.051-2.886-.051-3.997c-.005-.133-.113-.241-.236-.241zm1.143.218c-.13 0-.24.115-.24.257l-.025 3.779.025 2.886c0 .142.11.257.24.257.132 0 .24-.115.24-.257l.03-2.886-.03-3.779c0-.142-.108-.257-.24-.257zm1.137-.495c-.14 0-.26.12-.26.27l-.01 4.014.01 2.887c0 .15.12.27.26.27.138 0 .255-.12.26-.27l.01-2.887-.01-4.014c-.005-.15-.122-.27-.26-.27zm5.188 2.593c-.36 0-.705.07-1.02.194-.21-2.39-2.24-4.264-4.72-4.264-.51 0-.99.074-1.44.209-.18.054-.22.11-.22.219v8.33c0 .113.088.207.2.217h7.2c1.33 0 2.41-1.075 2.41-2.4S22.53 13.49 21.2 13.49z" />
    </svg>
  )
}

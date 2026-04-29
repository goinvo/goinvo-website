'use client'

import { useEffect, useRef } from 'react'

const TRANSITION_MS = 500
const TIMEOUT_MS = 4500

function shuffleSlides(slides: HTMLLIElement[]) {
  const shuffled = [...slides]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = current
  }

  return shuffled
}

function setInactive(slide: HTMLLIElement) {
  slide.classList.remove('rslides1_on')
  slide.style.float = 'none'
  slide.style.position = 'absolute'
  slide.style.opacity = '0'
  slide.style.zIndex = '1'
  slide.style.display = 'list-item'
  slide.style.transition = `opacity ${TRANSITION_MS}ms ease-in-out`
}

function setActive(slide: HTMLLIElement) {
  slide.classList.add('rslides1_on')
  slide.style.display = 'block'
  slide.style.float = 'left'
  slide.style.position = 'relative'
  slide.style.opacity = '1'
  slide.style.zIndex = '2'
  slide.style.transition = `opacity ${TRANSITION_MS}ms ease-in-out`
}

function resetSlide(slide: HTMLLIElement) {
  slide.removeAttribute('id')
  slide.removeAttribute('style')
  slide.classList.remove('rslides1_on')
}

function setActiveDot(dots: HTMLButtonElement[], activeIndex: number) {
  dots.forEach((dot, index) => {
    const isActive = index === activeIndex
    dot.classList.toggle('active', isActive)
    dot.setAttribute('aria-current', isActive ? 'true' : 'false')
  })
}

export function OralHistorySlideshow() {
  const activeIndexRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const slideshow = document.querySelector<HTMLUListElement>(
      '#oral-history-legacy #slideshow'
    )

    if (!slideshow || slideshow.dataset.slideshowInitialized === 'true') {
      return
    }

    const container = slideshow.parentElement
    const originalSlides = Array.from(slideshow.children).filter(
      (child): child is HTMLLIElement => child instanceof HTMLLIElement
    )

    if (!container || originalSlides.length <= 1) {
      return
    }

    slideshow.dataset.slideshowInitialized = 'true'
    slideshow.classList.add('rslides1')

    let slides = shuffleSlides(originalSlides)
    for (const slide of slides) {
      slideshow.appendChild(slide)
    }

    slides.forEach((slide, index) => {
      slide.id = `rslides1_s${index}`
      if (index === 0) {
        setActive(slide)
      } else {
        setInactive(slide)
      }
    })

    const prev = document.createElement('a')
    prev.className = 'rslides_nav rslides1_nav prev'
    prev.href = '#'
    prev.setAttribute('aria-label', 'Previous slide')

    const next = document.createElement('a')
    next.className = 'rslides_nav rslides1_nav next'
    next.href = '#'
    next.setAttribute('aria-label', 'Next slide')

    slideshow.after(prev, next)

    const caption = container.querySelector('.caption')
    const dotsContainer = document.createElement('div')
    dotsContainer.className = 'rslides-dots'
    dotsContainer.setAttribute('aria-label', 'Slideshow image navigation')

    const dots = slides.map((_, index) => {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'rslides-dot'
      dot.setAttribute('aria-label', `Show image ${index + 1} of ${slides.length}`)
      dot.dataset.slideIndex = String(index)
      dotsContainer.appendChild(dot)

      return dot
    })

    if (caption) {
      caption.after(dotsContainer)
    } else {
      next.after(dotsContainer)
    }
    setActiveDot(dots, 0)

    let controlsPaused = false

    function showSlide(index: number) {
      const normalizedIndex = (index + slides.length) % slides.length
      const currentIndex = activeIndexRef.current

      if (normalizedIndex === currentIndex) return

      setInactive(slides[currentIndex])
      setActive(slides[normalizedIndex])
      activeIndexRef.current = normalizedIndex
      setActiveDot(dots, normalizedIndex)
    }

    function startTimer() {
      if (controlsPaused) return

      stopTimer()
      timerRef.current = window.setInterval(() => {
        showSlide(activeIndexRef.current + 1)
      }, TIMEOUT_MS)
    }

    function stopTimer() {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    function handlePrevious(event: MouseEvent) {
      event.preventDefault()
      showSlide(activeIndexRef.current - 1)
      startTimer()
    }

    function handleNext(event: MouseEvent) {
      event.preventDefault()
      showSlide(activeIndexRef.current + 1)
      startTimer()
    }

    function handleDotClick(event: MouseEvent) {
      const dot = event.currentTarget as HTMLButtonElement
      const index = Number(dot.dataset.slideIndex)
      if (Number.isNaN(index)) return

      showSlide(index)
      startTimer()
    }

    function handleControlsMouseEnter() {
      controlsPaused = true
      stopTimer()
    }

    function handleControlsMouseLeave() {
      controlsPaused = false
      startTimer()
    }

    prev.addEventListener('click', handlePrevious)
    next.addEventListener('click', handleNext)
    prev.addEventListener('mouseenter', handleControlsMouseEnter)
    next.addEventListener('mouseenter', handleControlsMouseEnter)
    prev.addEventListener('mouseleave', handleControlsMouseLeave)
    next.addEventListener('mouseleave', handleControlsMouseLeave)
    dotsContainer.addEventListener('mouseenter', handleControlsMouseEnter)
    dotsContainer.addEventListener('mouseleave', handleControlsMouseLeave)

    for (const dot of dots) {
      dot.addEventListener('click', handleDotClick)
    }

    startTimer()

    return () => {
      stopTimer()
      prev.removeEventListener('click', handlePrevious)
      next.removeEventListener('click', handleNext)
      prev.removeEventListener('mouseenter', handleControlsMouseEnter)
      next.removeEventListener('mouseenter', handleControlsMouseEnter)
      prev.removeEventListener('mouseleave', handleControlsMouseLeave)
      next.removeEventListener('mouseleave', handleControlsMouseLeave)
      dotsContainer.removeEventListener('mouseenter', handleControlsMouseEnter)
      dotsContainer.removeEventListener('mouseleave', handleControlsMouseLeave)
      for (const dot of dots) {
        dot.removeEventListener('click', handleDotClick)
      }
      prev.remove()
      next.remove()
      dotsContainer.remove()

      for (const slide of slides) {
        resetSlide(slide)
      }

      for (const slide of originalSlides) {
        slideshow.appendChild(slide)
      }

      slideshow.classList.remove('rslides1')
      delete slideshow.dataset.slideshowInitialized
      activeIndexRef.current = 0
      slides = []
    }
  }, [])

  return null
}

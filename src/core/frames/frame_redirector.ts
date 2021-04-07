import { FormSubmitObserver, FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"

export class FrameRedirector implements LinkInterceptorDelegate, FormSubmitObserverDelegate {
  readonly element: Element
  readonly linkInterceptor: LinkInterceptor
  readonly formSubmitObserver: FormSubmitObserver

  constructor(element: Element) {
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formSubmitObserver = new FormSubmitObserver(this, element)
  }

  start() {
    this.linkInterceptor.start()
    this.formSubmitObserver.start()
  }

  stop() {
    this.linkInterceptor.stop()
    this.formSubmitObserver.stop()
  }

  shouldInterceptLinkClick(element: Element, url: string) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.setAttribute("reloadable", "")
      frame.src = url
    }
  }

  willSubmitForm(element: HTMLFormElement, submitter?: HTMLElement) {
    return element.closest("turbo-frame") == null &&
      this.shouldRedirect(element, submitter)
  }

  formSubmitted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.removeAttribute("reloadable")
      frame.delegate.formSubmitted(element, submitter)
    }
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}

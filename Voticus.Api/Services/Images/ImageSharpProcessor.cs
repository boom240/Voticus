using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using Voticus.Api.Domain;

namespace Voticus.Api.Services.Images;

public class ImageSharpProcessor : IImageProcessor
{
    public async Task<ProcessedImage> ProcessAsync(Stream input, CancellationToken cancellationToken = default)
    {
        // Buffer so the stream can be read twice (identify, then decode). Uploads are capped at 5 MB.
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length == 0)
        {
            throw DomainException.BadRequest("The image file is empty.");
        }
        if (buffer.Length > ImageRules.MaxBytes)
        {
            throw DomainException.BadRequest("Each image must be 5 MB or smaller.");
        }

        buffer.Position = 0;
        ImageInfo info;
        try
        {
            info = await Image.IdentifyAsync(buffer, cancellationToken);
        }
        catch (UnknownImageFormatException)
        {
            throw DomainException.BadRequest("Unsupported image type. Use JPEG, PNG, WebP or GIF.");
        }
        catch (InvalidImageContentException)
        {
            throw DomainException.BadRequest("The image file could not be read.");
        }

        var format = info.Metadata.DecodedImageFormat;
        var (encoder, thumbEncoder, extension) = Encoders(format);

        if (Math.Max(info.Width, info.Height) > ImageRules.MaxDimension)
        {
            throw DomainException.BadRequest("Images must be no more than 8000 pixels on the longest side.");
        }

        buffer.Position = 0;
        using var image = await Image.LoadAsync(buffer, cancellationToken);

        // Re-encoding with a clean metadata block strips EXIF, XMP and IPTC. See AC-P5.
        image.Metadata.ExifProfile = null;
        image.Metadata.XmpProfile = null;
        image.Metadata.IptcProfile = null;

        using var full = new MemoryStream();
        await image.SaveAsync(full, encoder, cancellationToken);

        // Thumbnail and placeholder use the first frame only, so animated GIFs stay cheap.
        using var firstFrame = image.Frames.CloneFrame(0);
        firstFrame.Metadata.ExifProfile = null;
        firstFrame.Metadata.XmpProfile = null;
        firstFrame.Metadata.IptcProfile = null;

        using var thumbnail = firstFrame.Clone(x => x.Resize(new ResizeOptions
        {
            Size = new Size(ImageRules.ThumbnailWidth, 0),
            Mode = ResizeMode.Max,
        }));
        using var thumbStream = new MemoryStream();
        await thumbnail.SaveAsync(thumbStream, thumbEncoder, cancellationToken);

        using var placeholder = firstFrame.Clone(x => x.Resize(new ResizeOptions
        {
            Size = new Size(ImageRules.PlaceholderWidth, 0),
            Mode = ResizeMode.Max,
        }));
        using var placeholderStream = new MemoryStream();
        await placeholder.SaveAsync(placeholderStream, new JpegEncoder { Quality = 50 }, cancellationToken);
        var dataUrl = "data:image/jpeg;base64," + Convert.ToBase64String(placeholderStream.ToArray());

        return new ProcessedImage(
            full.ToArray(),
            thumbStream.ToArray(),
            dataUrl,
            image.Width,
            image.Height,
            ImageRules.ContentTypeForExtension(extension),
            extension);
    }

    private static (IImageEncoder Full, IImageEncoder Thumb, string Extension) Encoders(IImageFormat format)
    {
        if (format is JpegFormat) return (new JpegEncoder { Quality = 88 }, new JpegEncoder { Quality = 80 }, "jpg");
        if (format is PngFormat) return (new PngEncoder(), new PngEncoder(), "png");
        if (format is WebpFormat) return (new WebpEncoder { Quality = 88 }, new WebpEncoder { Quality = 80 }, "webp");
        if (format is GifFormat) return (new GifEncoder(), new GifEncoder(), "gif");
        throw DomainException.BadRequest("Unsupported image type. Use JPEG, PNG, WebP or GIF.");
    }
}
